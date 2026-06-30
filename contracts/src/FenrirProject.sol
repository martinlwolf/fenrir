// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IFenrirProjectCallback.sol";
import "./interfaces/IFenrirTokenMinimal.sol";
import "./interfaces/IFenrirGovernorMinimal.sol";
import "./interfaces/IFenrirFactoryCallback.sol";
import {
    COMMISSION_BPS,
    MAX_RETRIES_PER_MILESTONE,
    RETRY_WINDOW,
    BPS_DENOMINATOR
} from "./FenrirConstants.sol";

/// @title FenrirProject
/// @notice Custodia los fondos de un proyecto Fenrir, en tranches por hito, y conduce su
/// ciclo de vida completo: fondeo (FMPA/FF), hitos de obra con declaracion/votacion/
/// reintentos, y -- solo en Fenrir Inversion -- la etapa de venta final con reparto
/// proporcional. Una instancia por proyecto, desplegada por FenrirFactory.
contract FenrirProject is ReentrancyGuard, IFenrirProjectCallback {
    enum ProjectType { Investment, Civic }
    enum ProjectStatus { Funding, Building, Selling, Completed, Cancelled }
    enum MilestoneStatus { Pending, Declared, Voting, Approved, Rejected }
    enum OfferStatus { Voting, Approved, Rejected, Refunded, Executed }

    struct Milestone {
        uint256 budget;
        uint256 deadline;
        uint8 retryCount;
        bool trancheReleased;
        MilestoneStatus status;
        bytes32 reportHash;
        string reportUrl;
        uint256 proposalId;
    }

    struct SaleOffer {
        address buyer;
        uint256 amount;
        uint256 proposalId;
        OfferStatus status;
    }


    address public immutable factory;
    address public immutable developer;
    IFenrirTokenMinimal public immutable token;
    IFenrirGovernorMinimal public immutable governor;
    ProjectType public immutable projectType;

    uint256 public immutable fmpa;
    uint256 public immutable ff;
    uint256 public immutable fundingDeadline;
    uint256 public immutable estimatedSalePrice;

    ProjectStatus public status;
    bool public fmpaReached;
    bool public roundClosed; // se llego al ff?
    bool public obraStarted;

    uint256 public totalRaised;               // cuánto ETH entró en total
    uint256 public totalReleasedToDeveloper;  // cuánto ya se le pagó al developer
    uint256 public penaltyAccumulatedBps;     // penalización acumulada (en BPS)

    uint256 public commissionBasis;     // base sobre la que se calcula la comisión (Inversión)
    uint256 public reservedCommission;  // comisión reservada tranche a tranche (Cívico)
    bool public commissionClaimed;      // ¿ya cobró la comisión?
    uint256 public refundPool;          // pozo de reembolso (si se cancela)
    uint256 public distributionPool;    // pozo de reparto (si se vende)


    Milestone[] public milestones;
    uint256 public currentMilestoneIndex;
    uint256[] private _cumulativeBudget;
    // Publico: el plazo (en segundos) que tendra cada hito una vez activado. Se fija al crear
    // el proyecto; la fecha absoluta (Milestone.deadline) recien se calcula al activarse el hito.
    uint256[] public milestoneDurations;

    mapping(uint256 => SaleOffer) public saleOffers;
    uint256 public nextOfferId = 1;
    uint256 public bestApprovedOfferId;
    uint256 public salePrice;

    event Invested(address indexed investor, uint256 amount);
    event ArbiterElectionStarted(uint256 proposalId);
    event FundingRoundClosed(uint256 totalRaised); // cuando se llega al FMPA?
    event ArbiterElected(address indexed newArbiter);
    event MilestoneDeclared(uint256 indexed milestoneId, bytes32 reportHash, string reportUrl);
    event MilestoneVotingOpened(uint256 indexed milestoneId, uint256 proposalId);
    event MilestoneVotingPaused(uint256 indexed milestoneId);
    event MilestoneApproved(uint256 indexed milestoneId);
    event MilestoneRejected(uint256 indexed milestoneId, uint8 retryCount);
    event TrancheReleased(uint256 indexed milestoneId, uint256 amount);
    event TrancheReleasePending(uint256 indexed milestoneId);
    event SaleStageOpened();
    event SaleOfferSubmitted(uint256 indexed offerId, address indexed buyer, uint256 amount, uint256 proposalId);
    event SaleOfferApproved(uint256 indexed offerId, uint256 amount);
    event SaleOfferRefunded(uint256 indexed offerId, uint256 amount);
    event SaleExecuted(uint256 indexed offerId, uint256 salePrice);
    event ProjectCompleted();
    event ProjectCancelled(uint256 refundPool);
    event RefundClaimed(address indexed investor, uint256 amount);
    event DistributionClaimed(address indexed investor, uint256 amount);
    event CommissionClaimed(uint256 amount);

    constructor(
        address token_,
        address governor_,
        address developer_,
        ProjectType projectType_,
        uint256 fmpa_,
        uint256 ff_,
        uint256 fundingDeadline_,
        uint256[] memory milestoneBudgets_,
        uint256[] memory milestoneDurations_,
        uint256 estimatedSalePrice_
    ) {
        require(
            milestoneBudgets_.length == milestoneDurations_.length
            && milestoneBudgets_.length > 0, "FenrirProject: milestones mismatch"
        );

        uint256 sum = 0;
        for (uint256 i = 0; i < milestoneBudgets_.length; i++) {
            sum += milestoneBudgets_[i];
            _cumulativeBudget.push(sum);
            milestoneDurations.push(milestoneDurations_[i]);
            milestones.push(Milestone({
                budget: milestoneBudgets_[i],
                deadline: 0,
                retryCount: 0,
                trancheReleased: false,
                status: MilestoneStatus.Pending,
                reportHash: bytes32(0),
                reportUrl: "",
                proposalId: 0
            }));
        }
        require(sum == ff_, "FenrirProject: FF must equal sum of milestone budgets");
        require(fmpa_ >= milestoneBudgets_[0] && fmpa_ <= ff_, "FenrirProject: invalid FMPA");

        factory = msg.sender;
        token = IFenrirTokenMinimal(token_);
        governor = IFenrirGovernorMinimal(governor_);
        developer = developer_;
        projectType = projectType_;
        fmpa = fmpa_;
        ff = ff_;
        fundingDeadline = fundingDeadline_;
        estimatedSalePrice = estimatedSalePrice_;
        status = ProjectStatus.Funding;
    }

    modifier onlyGovernor() {
        require(msg.sender == address(governor), "FenrirProject: only governor");
        _;
    }

    // ---------------------------------------------------------------------
    // Fondeo
    // ---------------------------------------------------------------------

    function invest() external payable nonReentrant {
        require(status == ProjectStatus.Funding || status == ProjectStatus.Building, "FenrirProject: not investable");
        require(!roundClosed, "FenrirProject: round closed");
        require(msg.sender != developer, "FenrirProject: developer cannot invest");
        require(msg.value > 0, "FenrirProject: zero amount");
        if (!fmpaReached) {
            require(block.timestamp <= fundingDeadline, "FenrirProject: funding window expired");
        }

        totalRaised += msg.value;
        token.mint(msg.sender, msg.value);
        emit Invested(msg.sender, msg.value);

        if (!fmpaReached && totalRaised >= fmpa) {
            fmpaReached = true;
            status = ProjectStatus.Building;
            emit ArbiterElectionStarted(governor.proposeArbiterElection());
        }

        if (!roundClosed && totalRaised >= ff) {
            roundClosed = true;
            emit FundingRoundClosed(totalRaised);
        }

        _pokeFundingGates();
    }

    /// Cualquiera puede llamarla si nunca se alcanzo el FMPA dentro del TTL de fondeo.
    /// Reembolso del 100% de lo aportado, porque todavia no se gasto nada en obra.
    function cancelExpiredFunding() external {
        require(status == ProjectStatus.Funding, "FenrirProject: not in funding");
        require(!fmpaReached, "FenrirProject: FMPA already reached");
        require(block.timestamp > fundingDeadline, "FenrirProject: funding window still open");
        require(totalRaised < fmpa, "FenrirProject: FMPA already covered");
        _cancel();
    }

    // ---------------------------------------------------------------------
    // Hito 0 -- arranque de obra
    // ---------------------------------------------------------------------

    function onArbiterElected(address newArbiter) external override onlyGovernor {
        emit ArbiterElected(newArbiter);
        if (!obraStarted) {
            obraStarted = true;
            _activateMilestone(0);
            _releaseTranche(0);
        }
    }

    function _activateMilestone(uint256 i) internal {
        milestones[i].deadline = block.timestamp + milestoneDurations[i];
    }

    // ---------------------------------------------------------------------
    // Ciclo de hitos de obra
    // ---------------------------------------------------------------------

    function declareMilestone(bytes32 reportHash, string calldata reportUrl) external {
        require(msg.sender == developer, "FenrirProject: only developer");
        require(status == ProjectStatus.Building && obraStarted, "FenrirProject: not building");

        uint256 i = currentMilestoneIndex;
        Milestone storage m = milestones[i];
        require(m.status == MilestoneStatus.Pending, "FenrirProject: milestone not pending");
        require(block.timestamp <= m.deadline, "FenrirProject: deadline passed");

        m.reportHash = reportHash;
        m.reportUrl = reportUrl;
        m.status = MilestoneStatus.Declared;
        emit MilestoneDeclared(i, reportHash, reportUrl);

        _tryOpenVoting(i);
    }

    function _tryOpenVoting(uint256 i) internal {
        Milestone storage m = milestones[i];
        if (m.status != MilestoneStatus.Declared) return;
        if (!_fundsAvailableFor(i)) {
            emit MilestoneVotingPaused(i);
            return;
        }
        uint256 proposalId = governor.proposeMilestone(i);
        m.proposalId = proposalId;
        m.status = MilestoneStatus.Voting;
        emit MilestoneVotingOpened(i, proposalId);
    }

    function onMilestoneResolved(uint256 milestoneId, bool approved) external override onlyGovernor {
        Milestone storage m = milestones[milestoneId];
        require(m.status == MilestoneStatus.Voting, "FenrirProject: milestone not voting");

        if (approved) {
            m.status = MilestoneStatus.Approved;
            emit MilestoneApproved(milestoneId);
            _releaseTranche(milestoneId);
            _advanceAfterApproval(milestoneId);
        } else {
            m.retryCount += 1;
            _applyPenalty();
            emit MilestoneRejected(milestoneId, m.retryCount);
            if (m.retryCount > MAX_RETRIES_PER_MILESTONE) {
                _cancel();
            } else {
                m.status = MilestoneStatus.Pending;
                m.deadline = block.timestamp + RETRY_WINDOW;
            }
        }
    }

    function _advanceAfterApproval(uint256 i) internal {
        if (i + 1 < milestones.length) {
            currentMilestoneIndex = i + 1;
            _activateMilestone(i + 1);
        } else if (projectType == ProjectType.Civic) {
            status = ProjectStatus.Completed;
            emit ProjectCompleted();
            IFenrirFactoryCallback(factory).recordSuccess(developer);
        } else {
            status = ProjectStatus.Selling;
            emit SaleStageOpened();
        }
    }

    /// Cualquier inversor puede cancelar si el desarrollador no declaro el hito vigente
    /// antes de su deadline, o si quedo pausado esperando fondos para el proximo hito.
    function cancelStalledMilestone() external {
        require(status == ProjectStatus.Building, "FenrirProject: not building");
        require(token.balanceOf(msg.sender) > 0, "FenrirProject: not an investor");

        Milestone storage m = milestones[currentMilestoneIndex];
        bool deadlineMissed = m.status == MilestoneStatus.Pending && block.timestamp > m.deadline;
        bool stalledForFunds = m.status == MilestoneStatus.Declared && !_fundsAvailableFor(currentMilestoneIndex);
        require(deadlineMissed || stalledForFunds, "FenrirProject: milestone not stalled");
        _cancel();
    }

    function pokeFundingGates() external {
        _pokeFundingGates();
    }

    function _pokeFundingGates() internal {
        if (status != ProjectStatus.Building) return;
        if (milestones[currentMilestoneIndex].status == MilestoneStatus.Declared) {
            _tryOpenVoting(currentMilestoneIndex);
        }
        for (uint256 i = 0; i <= currentMilestoneIndex; i++) {
            if (milestones[i].status == MilestoneStatus.Approved && !milestones[i].trancheReleased) {
                _releaseTranche(i);
            }
        }
    }

    function _fundsAvailableFor(uint256 i) internal view returns (bool) {
        return totalRaised >= _cumulativeBudget[i];
    }

    /// En Civico retiene el 10% de comision de cada tranche en el momento en que se libera
    /// -- no al completar el proyecto -- para que quede reservada de verdad desde el primer
    /// desembolso y nunca falten fondos para pagarla al completar (ver fondeo-y-comision.md).
    /// Si el proyecto se cancela antes de completarse, lo retenido nunca se le debe al
    /// developer (la comision es solo por exito) y queda disponible en el refundPool.
    function _releaseTranche(uint256 i) internal {
        Milestone storage m = milestones[i];
        if (m.trancheReleased) return;
        if (!_fundsAvailableFor(i)) {
            emit TrancheReleasePending(i);
            return;
        }
        m.trancheReleased = true;

        uint256 toDeveloper = m.budget;
        if (projectType == ProjectType.Civic) {
            uint256 reserve = (m.budget * COMMISSION_BPS) / BPS_DENOMINATOR;
            reservedCommission += reserve;
            toDeveloper -= reserve;
        }

        totalReleasedToDeveloper += toDeveloper;
        (bool ok, ) = developer.call{value: toDeveloper}("");
        require(ok, "FenrirProject: transfer to developer failed");
        emit TrancheReleased(i, toDeveloper);
    }

    function _applyPenalty() internal {
        uint256 perRejection = BPS_DENOMINATOR / (milestones.length * MAX_RETRIES_PER_MILESTONE);
        uint256 next = penaltyAccumulatedBps + perRejection;
        penaltyAccumulatedBps = next > BPS_DENOMINATOR ? BPS_DENOMINATOR : next;
    }

    // ---------------------------------------------------------------------
    // Cancelacion y reembolso
    // ---------------------------------------------------------------------

    function _cancel() internal {
        status = ProjectStatus.Cancelled;
        refundPool = totalRaised - totalReleasedToDeveloper;
        emit ProjectCancelled(refundPool);
        IFenrirFactoryCallback(factory).recordFailure(developer);
    }

    function claimRefund() external nonReentrant {
        require(status == ProjectStatus.Cancelled, "FenrirProject: not cancelled");
        uint256 balance = token.balanceOf(msg.sender);
        require(balance > 0, "FenrirProject: nothing to claim");
        uint256 supply = token.totalSupply();
        uint256 share = (refundPool * balance) / supply;
        refundPool -= share;
        token.projectBurn(msg.sender, balance);
        (bool ok, ) = msg.sender.call{value: share}("");
        require(ok, "FenrirProject: refund transfer failed");
        emit RefundClaimed(msg.sender, share);
    }

    // ---------------------------------------------------------------------
    // Etapa de venta (solo Fenrir Inversion)
    // ---------------------------------------------------------------------

    function submitOffer() external payable nonReentrant returns (uint256 offerId) {
        require(projectType == ProjectType.Investment, "FenrirProject: civic has no sale stage");
        require(status == ProjectStatus.Selling, "FenrirProject: not selling");
        require(msg.value > 0, "FenrirProject: zero offer");

        offerId = nextOfferId++;
        uint256 proposalId = governor.proposeSaleOffer(offerId);
        saleOffers[offerId] = SaleOffer({ buyer: msg.sender, amount: msg.value, proposalId: proposalId, status: OfferStatus.Voting });
        emit SaleOfferSubmitted(offerId, msg.sender, msg.value, proposalId);
    }

    function onSaleOfferResolved(uint256 offerId, bool approved) external override onlyGovernor {
        SaleOffer storage offer = saleOffers[offerId];
        require(offer.status == OfferStatus.Voting, "FenrirProject: offer not voting");

        if (!approved) {
            offer.status = OfferStatus.Rejected;
            _refundOffer(offerId);
            return;
        }

        offer.status = OfferStatus.Approved;
        emit SaleOfferApproved(offerId, offer.amount);

        if (bestApprovedOfferId == 0) {
            bestApprovedOfferId = offerId;
        } else if (offer.amount > saleOffers[bestApprovedOfferId].amount) {
            uint256 previousBestId = bestApprovedOfferId;
            bestApprovedOfferId = offerId;
            saleOffers[previousBestId].status = OfferStatus.Refunded;
            _refundOffer(previousBestId);
        } else {
            offer.status = OfferStatus.Refunded;
            _refundOffer(offerId);
        }
    }

    function _refundOffer(uint256 offerId) internal {
        SaleOffer storage offer = saleOffers[offerId];
        uint256 amount = offer.amount;
        offer.amount = 0;
        (bool ok, ) = offer.buyer.call{value: amount}("");
        require(ok, "FenrirProject: offer refund failed");
        emit SaleOfferRefunded(offerId, amount);
    }

    /// Concreta la venta con la mejor oferta aprobada hasta el momento. Exige que
    /// cualquier otra oferta ya haya terminado de votarse -- no fuerza el descarte de una
    /// oferta todavia en votacion que podria terminar pagando mas.
    function executeSale() external nonReentrant {
        require(status == ProjectStatus.Selling, "FenrirProject: not selling");
        require(bestApprovedOfferId != 0, "FenrirProject: no approved offer");

        for (uint256 i = 1; i < nextOfferId; i++) {
            if (i != bestApprovedOfferId) {
                require(saleOffers[i].status != OfferStatus.Voting, "FenrirProject: other offers still voting");
            }
        }

        SaleOffer storage winner = saleOffers[bestApprovedOfferId];
        salePrice = winner.amount;
        winner.status = OfferStatus.Executed;

        commissionBasis = salePrice;
        distributionPool = salePrice - _commission();
        status = ProjectStatus.Completed;
        emit SaleExecuted(bestApprovedOfferId, salePrice);
        IFenrirFactoryCallback(factory).recordSuccess(developer);
    }

    function claimDistribution() external nonReentrant {
        require(projectType == ProjectType.Investment, "FenrirProject: civic has no distribution");
        require(status == ProjectStatus.Completed, "FenrirProject: not completed");
        uint256 balance = token.balanceOf(msg.sender);
        require(balance > 0, "FenrirProject: nothing to claim");
        uint256 supply = token.totalSupply();
        uint256 share = (distributionPool * balance) / supply;
        distributionPool -= share;
        token.projectBurn(msg.sender, balance);
        (bool ok, ) = msg.sender.call{value: share}("");
        require(ok, "FenrirProject: distribution transfer failed");
        emit DistributionClaimed(msg.sender, share);
    }

    // ---------------------------------------------------------------------
    // Comision del desarrollador
    // ---------------------------------------------------------------------

    function _commission() internal view returns (uint256) {
        // En Civico la base ya es la comision efectivamente retenida tranche por tranche
        // (reservedCommission); en Inversion se calcula sobre el precio final de venta.
        uint256 gross = projectType == ProjectType.Civic
            ? reservedCommission
            : (commissionBasis * COMMISSION_BPS) / BPS_DENOMINATOR;
        return (gross * (BPS_DENOMINATOR - penaltyAccumulatedBps)) / BPS_DENOMINATOR;
    }

    function claimCommission() external nonReentrant {
        require(msg.sender == developer, "FenrirProject: only developer");
        require(status == ProjectStatus.Completed, "FenrirProject: not completed");
        require(!commissionClaimed, "FenrirProject: already claimed");
        commissionClaimed = true;
        uint256 amount = _commission();
        (bool ok, ) = developer.call{value: amount}("");
        require(ok, "FenrirProject: commission transfer failed");
        emit CommissionClaimed(amount);
    }

    function milestonesCount() external view returns (uint256) {
        return milestones.length;
    }
}
