// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./interfaces/IFenrirGovernorArbiter.sol";
import "./interfaces/IFenrirVotesToken.sol";
import "./interfaces/IFenrirProjectCallback.sol";
import "./interfaces/IFenrirGovernorMinimal.sol";

/// @title FenrirGovernor
/// @notice Motor de votacion de un proyecto Fenrir, inspirado en el patron Governor de
/// OpenZeppelin pero implementado a medida (no extiende Governor.sol) porque las reglas de
/// Fenrir -- cierre anticipado al 100% de participacion, eleccion de arbitro por pluralidad,
/// desempate/falta de quorum resuelta por el arbitro o al azar, ofertas de venta concurrentes
/// con peso de voto fijo para el desarrollador -- no encajan en el flujo binario estandar de
/// Governor.sol sin reescribir la mayoria de sus hooks igual. Una instancia por proyecto.
contract FenrirGovernor is ERC1155, IFenrirGovernorArbiter, IFenrirGovernorMinimal {
    enum VotingMode {
        ByToken,
        OneWalletOneVote
    }
    enum ProposalKind {
        ArbiterElection,
        Milestone,
        SaleOffer
    }
    enum ProposalStatus {
        Active,
        AwaitingArbiter,
        Resolved
    }
    enum VoteResult {
        None,
        Approved,
        Rejected
    }

    uint256 public constant QUORUM_BPS = 5100;
    uint256 public constant APPROVAL_THRESHOLD_BPS = 5100;
    uint256 public constant VOTING_PERIOD = 1 minutes;
    uint256 private constant BPS_DENOMINATOR = 10000;
    uint256 private constant DEVELOPER_SALE_VOTE_WEIGHT = 1 ether;

    struct Proposal {
        ProposalKind kind; // qué tipo (árbitro/hito/venta)
        uint256 refId; // a qué se refiere (id del hito o de la oferta)
        uint256 snapshotBlock; // el bloque de la "foto" de voto
        uint256 totalPowerAtSnapshot; // poder total en juego (para calcular quórum)
        uint256 deadline; // cuándo cierra
        bool extended; // ¿ya se extendió una vez?
        uint256 votesFor; // votos a favor (acumulados con peso)
        uint256 votesAgainst; // votos en contra
        uint256 weightVoted; // cuánto peso votó en total (favor + contra)
        ProposalStatus status; // activa / esperando árbitro / resuelta
        VoteResult result; // el resultado final
        address leadingCandidate; // (solo elección de arbitro) candidato puntero
        uint256 leadingVotes; // (solo elección de arbitro) votos del puntero
        bool tie; // (solo elección) ¿hay empate?
    }

    address public immutable factory;
    IFenrirVotesToken public immutable token;
    VotingMode public immutable votingMode;
    address public project;
    address public arbiter;
    bool private _projectInitialized;

    uint256 public nextProposalId = 1;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint256)) public votesForCandidate;
    mapping(uint256 => address[]) private _candidatesVoted;
    mapping(uint256 => mapping(address => bool)) private _candidateTracked;

    event ProposalCreated(
        uint256 indexed proposalId,
        ProposalKind kind,
        uint256 refId,
        uint256 snapshotBlock,
        uint256 deadline
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint256 weight
    );
    event ProposalExtended(uint256 indexed proposalId, uint256 newDeadline);
    event ProposalAwaitingArbiter(uint256 indexed proposalId);
    event ProposalResolved(uint256 indexed proposalId, VoteResult result);
    event ArbiterElected(address indexed arbiter, bool byRandom);
    event ArbiterVacated(address indexed formerArbiter);

    constructor(address token_, VotingMode votingMode_) ERC1155("") {
        factory = msg.sender;
        token = IFenrirVotesToken(token_);
        votingMode = votingMode_;
    }

    /// La factory la llama una sola vez, justo despues de desplegar el proyecto, para
    /// romper la dependencia circular Token/Governor/Project.
    function initialize(address project_) external {
        require(msg.sender == factory, "FenrirGovernor: only factory");
        require(!_projectInitialized, "FenrirGovernor: already initialized");
        project = project_;
        _projectInitialized = true;
    }

    modifier onlyProject() {
        require(msg.sender == project, "FenrirGovernor: only project");
        _;
    }

    modifier onlyArbiter() {
        require(
            msg.sender == arbiter && arbiter != address(0),
            "FenrirGovernor: only arbiter"
        );
        _;
    }

    // ---------------------------------------------------------------------
    // Creacion de propuestas (siempre disparada por el proyecto)
    // ---------------------------------------------------------------------

    function proposeArbiterElection()
        external
        override
        onlyProject
        returns (uint256 proposalId)
    {
        proposalId = _createProposal(ProposalKind.ArbiterElection, 0);
    }

    function proposeMilestone(
        uint256 milestoneId
    ) external override onlyProject returns (uint256 proposalId) {
        proposalId = _createProposal(ProposalKind.Milestone, milestoneId);
    }

    function proposeSaleOffer(
        uint256 offerId
    ) external override onlyProject returns (uint256 proposalId) {
        proposalId = _createProposal(ProposalKind.SaleOffer, offerId);
    }

    function _createProposal(
        ProposalKind kind,
        uint256 refId
    ) internal returns (uint256 proposalId) {
        proposalId = nextProposalId++;
        uint256 snapshotBlock = block.number - 1;
        Proposal storage p = proposals[proposalId];
        p.kind = kind;
        p.refId = refId;
        p.snapshotBlock = snapshotBlock;
        p.totalPowerAtSnapshot = _totalPowerAtSnapshot(snapshotBlock, kind);
        p.deadline = block.timestamp + VOTING_PERIOD;
        p.status = ProposalStatus.Active;
        emit ProposalCreated(
            proposalId,
            kind,
            refId,
            snapshotBlock,
            p.deadline
        );
    }

    // ---------------------------------------------------------------------
    // Votacion
    // ---------------------------------------------------------------------

    function castVote(uint256 proposalId, bool support) external {
        Proposal storage p = _activeProposal(proposalId);
        require(
            p.kind == ProposalKind.Milestone ||
                p.kind == ProposalKind.SaleOffer,
            "FenrirGovernor: not a binary vote"
        );
        uint256 weight = _votingWeight(msg.sender, p.snapshotBlock);
        require(weight > 0, "FenrirGovernor: no voting power");
        _registerVote(proposalId, p, msg.sender, weight);

        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }

        _afterVoteCast(proposalId, p);
    }

    /// Voto del desarrollador en una oferta de venta, con el mismo peso que 1 FDT, sin
    /// veto ni peso especial -- el desarrollador no tiene FDT (no puede invertir en su
    /// propio proyecto) asi que no participa via castVote.
    function castDeveloperSaleVote(uint256 proposalId, bool support) external {
        Proposal storage p = _activeProposal(proposalId);
        require(
            p.kind == ProposalKind.SaleOffer,
            "FenrirGovernor: not a sale offer"
        );
        require(
            msg.sender == IFenrirProjectCallback(project).developer(),
            "FenrirGovernor: only developer"
        );
        _registerVote(proposalId, p, msg.sender, DEVELOPER_SALE_VOTE_WEIGHT);

        if (support) {
            p.votesFor += DEVELOPER_SALE_VOTE_WEIGHT;
        } else {
            p.votesAgainst += DEVELOPER_SALE_VOTE_WEIGHT;
        }

        _afterVoteCast(proposalId, p);
    }

    function castElectionVote(uint256 proposalId, address candidate) external {
        Proposal storage p = _activeProposal(proposalId);
        require(
            p.kind == ProposalKind.ArbiterElection,
            "FenrirGovernor: not an election"
        );
        require(
            candidate != IFenrirProjectCallback(project).developer(),
            "FenrirGovernor: developer cannot be candidate"
        );
        uint256 weight = _votingWeight(msg.sender, p.snapshotBlock);
        require(weight > 0, "FenrirGovernor: no voting power");
        _registerVote(proposalId, p, msg.sender, weight);

        if (!_candidateTracked[proposalId][candidate]) {
            _candidateTracked[proposalId][candidate] = true;
            _candidatesVoted[proposalId].push(candidate);
        }
        uint256 newTotal = votesForCandidate[proposalId][candidate] + weight;
        votesForCandidate[proposalId][candidate] = newTotal;

        if (newTotal > p.leadingVotes) {
            p.leadingVotes = newTotal;
            p.leadingCandidate = candidate;
            p.tie = false;
        } else if (
            newTotal == p.leadingVotes && candidate != p.leadingCandidate
        ) {
            p.tie = true;
        }

        _afterVoteCast(proposalId, p);
    }

    function _registerVote(
        uint256 proposalId,
        Proposal storage p,
        address voter,
        uint256 weight
    ) internal {
        require(!hasVoted[proposalId][voter], "FenrirGovernor: already voted");
        hasVoted[proposalId][voter] = true;
        p.weightVoted += weight;
        _mint(voter, proposalId, 1, "");
        emit VoteCast(proposalId, voter, weight);
    }

    function _afterVoteCast(uint256 proposalId, Proposal storage p) internal {
        if (
            p.totalPowerAtSnapshot > 0 &&
            p.weightVoted >= p.totalPowerAtSnapshot
        ) {
            _resolve(proposalId, p);
        }
    }

    function _activeProposal(
        uint256 proposalId
    ) internal view returns (Proposal storage p) {
        p = proposals[proposalId];
        require(
            p.status == ProposalStatus.Active,
            "FenrirGovernor: not active"
        );
        require(block.timestamp <= p.deadline, "FenrirGovernor: voting closed");
    }

    // ---------------------------------------------------------------------
    // Resolucion
    // ---------------------------------------------------------------------

    /// Cualquiera puede llamarla una vez vencido el plazo de votacion vigente. Resuelve,
    /// extiende una vez por falta de quorum, o deja la propuesta esperando al arbitro.
    function resolve(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(
            p.status == ProposalStatus.Active,
            "FenrirGovernor: not active"
        );
        require(
            block.timestamp > p.deadline,
            "FenrirGovernor: voting still open"
        );
        _resolve(proposalId, p);
    }

    function _quorumReached(Proposal storage p) internal view returns (bool) {
        return
            p.totalPowerAtSnapshot > 0 &&
            p.weightVoted * BPS_DENOMINATOR >=
            QUORUM_BPS * p.totalPowerAtSnapshot;
    }

    function _resolve(uint256 proposalId, Proposal storage p) internal {
        bool quorumReached = _quorumReached(p);

        if (
            !quorumReached &&
            p.kind != ProposalKind.ArbiterElection &&
            !p.extended
        ) {
            p.extended = true;
            p.deadline = block.timestamp + VOTING_PERIOD;
            emit ProposalExtended(proposalId, p.deadline);
            return;
        }

        bool tied = p.kind == ProposalKind.ArbiterElection
            ? (p.tie || p.leadingCandidate == address(0))
            : (quorumReached && p.votesFor == p.votesAgainst);

        if (!quorumReached || tied) {
            // El arbitro todavia no existe para resolver su propia eleccion (hito 0, o una
            // re-eleccion tras vacancia): ahi se recurre directo al azar. Para un hito o una
            // oferta de venta, en cambio, el camino documentado ante una vacancia es esperar
            // a que la re-eleccion (ya disparada por notifyArbiterDivested) resuelva un
            // nuevo arbitro, no resolver la votacion trabada al azar.
            if (p.kind == ProposalKind.ArbiterElection) {
                _resolveByRandom(proposalId, p, quorumReached);
            } else {
                p.status = ProposalStatus.AwaitingArbiter;
                emit ProposalAwaitingArbiter(proposalId);
            }
            return;
        }

        if (p.kind == ProposalKind.ArbiterElection) {
            // Quorum alcanzado y un candidato lidera sin empate: gana directo, sin azar.
            _finalize(proposalId, p, VoteResult.Approved);
            return;
        }

        VoteResult result = p.votesFor * BPS_DENOMINATOR >=
            APPROVAL_THRESHOLD_BPS * p.weightVoted
            ? VoteResult.Approved
            : VoteResult.Rejected;

        _finalize(proposalId, p, result);
    }

    /// El arbitro emite el voto que destraba la propuesta (falta de quorum persistente o
    /// empate exacto), inclinando el resultado hacia aprobar o rechazar.
    function arbiterDecide(
        uint256 proposalId,
        bool approve
    ) external onlyArbiter {
        Proposal storage p = proposals[proposalId];
        require(
            p.status == ProposalStatus.AwaitingArbiter,
            "FenrirGovernor: not awaiting arbiter"
        );
        _finalize(
            proposalId,
            p,
            approve ? VoteResult.Approved : VoteResult.Rejected
        );
    }

    /// Solo se llega aca para ProposalKind.ArbiterElection: es la unica votacion que se
    /// resuelve al azar directamente, porque todavia no existe ningun arbitro electo capaz
    /// de resolverla.
    function _resolveByRandom(
        uint256 proposalId,
        Proposal storage p,
        bool quorumReached
    ) internal {
        address[] memory pool = quorumReached
            ? _tiedCandidates(proposalId, p.leadingVotes)
            : _eligibleInvestors();
        if (pool.length == 0) {
            // Nadie voto todavia: la propuesta queda abierta hasta que haya al menos un
            // inversor elegible.
            p.deadline = block.timestamp + VOTING_PERIOD;
            return;
        }

        uint256 randomSeed = uint256(
            keccak256(
                abi.encodePacked(
                    blockhash(block.number - 1),
                    block.timestamp,
                    proposalId
                )
            )
        );
        p.leadingCandidate = pool[randomSeed % pool.length];
        _finalize(proposalId, p, VoteResult.Approved);
    }

    function _tiedCandidates(
        uint256 proposalId,
        uint256 leadingVotes
    ) internal view returns (address[] memory) {
        address[] memory voted = _candidatesVoted[proposalId];
        address[] memory buffer = new address[](voted.length);
        uint256 n = 0;
        for (uint256 i = 0; i < voted.length; i++) {
            if (votesForCandidate[proposalId][voted[i]] == leadingVotes) {
                buffer[n++] = voted[i];
            }
        }
        address[] memory tied = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            tied[i] = buffer[i];
        }
        return tied;
    }

    function _eligibleInvestors() internal view returns (address[] memory) {
        uint256 count = token.holdersCount();
        address[] memory buffer = new address[](count);
        uint256 n = 0;
        for (uint256 i = 0; i < count; i++) {
            address holder = token.holderAt(i);
            if (token.balanceOf(holder) > 0) {
                buffer[n++] = holder;
            }
        }
        address[] memory eligible = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            eligible[i] = buffer[i];
        }
        return eligible;
    }

    function _finalize(
        uint256 proposalId,
        Proposal storage p,
        VoteResult result
    ) internal {
        p.status = ProposalStatus.Resolved;
        p.result = result;
        emit ProposalResolved(proposalId, result);

        if (p.kind == ProposalKind.ArbiterElection) {
            bool byRandom = !_quorumReached(p) || p.tie;
            arbiter = p.leadingCandidate;
            emit ArbiterElected(arbiter, byRandom);
            IFenrirProjectCallback(project).onArbiterElected(arbiter);
        } else if (p.kind == ProposalKind.Milestone) {
            IFenrirProjectCallback(project).onMilestoneResolved(
                p.refId,
                result == VoteResult.Approved
            );
        } else {
            IFenrirProjectCallback(project).onSaleOfferResolved(
                p.refId,
                result == VoteResult.Approved
            );
        }
    }

    // ---------------------------------------------------------------------
    // Vacancia del arbitro
    // ---------------------------------------------------------------------

    /// La llama el FenrirToken cuando el arbitro electo transfiere todo su FDT y deja de
    /// ser inversor: pierde el rol y se repite el proceso de eleccion.
    function notifyArbiterDivested() external override {
        require(msg.sender == address(token), "FenrirGovernor: only token");
        if (arbiter == address(0)) return;
        emit ArbiterVacated(arbiter);
        arbiter = address(0);
        _createProposal(ProposalKind.ArbiterElection, 0);
    }

    // ---------------------------------------------------------------------
    // Poder de voto
    // ---------------------------------------------------------------------

    function _votingWeight(
        address account,
        uint256 snapshotBlock
    ) internal view returns (uint256) {
        uint256 pastVotes = token.getPastVotes(account, snapshotBlock);
        if (votingMode == VotingMode.ByToken) {
            return pastVotes;
        }
        return pastVotes > 0 ? 1 : 0;
    }

    function _totalPowerAtSnapshot(
        uint256 snapshotBlock,
        ProposalKind kind
    ) internal view returns (uint256) {
        uint256 base = votingMode == VotingMode.ByToken
            ? token.getPastTotalSupply(snapshotBlock)
            : _holderCountAtSnapshot(snapshotBlock);

        if (kind == ProposalKind.SaleOffer) {
            base += DEVELOPER_SALE_VOTE_WEIGHT;
        }
        return base;
    }

    function _holderCountAtSnapshot(
        uint256 snapshotBlock
    ) internal view returns (uint256) {
        uint256 count = token.holdersCount();
        uint256 n = 0;
        for (uint256 i = 0; i < count; i++) {
            if (token.getPastVotes(token.holderAt(i), snapshotBlock) > 0) {
                n++;
            }
        }
        return n;
    }
}
