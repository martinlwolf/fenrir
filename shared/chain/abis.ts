// ABIs human-readable (ethers v6) de los 4 contratos de Fenrir. Fuente unica compartida por
// client/ y server/: el server usa los `event`/`view` para el listener y las lecturas; el
// client usa las funciones de escritura que firma. Los contratos se despliegan manualmente
// via Remix (constitution Principio IV): si cambia una firma, se actualiza solo aca.
//
// Se tipan como string[] (no `as const`) porque tanto ethers (Contract/Interface) como el
// EventSource del listener esperan un array mutable de strings.

export const FENRIR_FACTORY_ABI: string[] = [
  // events
  "event DeveloperRegistered(address indexed wallet, string razonSocial, string cuit)",
  "event ProjectCreated(address indexed project, address indexed token, address indexed governor, address developer, uint8 projectType)",
  // views
  "function developers(address) view returns (string razonSocial, string cuit, bool registered)",
  "function projectsCount() view returns (uint256)",
  "function allProjects(uint256) view returns (address)",
  "function completionCertificate() view returns (address)",
  "function failureCertificate() view returns (address)",
  // writes
  "function registerDeveloper(string razonSocial, string cuit)",
  "function createProject(string tokenName, string tokenSymbol, uint8 projectType, uint8 votingMode, uint256 fmpa, uint256 ff, uint256 fundingDeadline, uint256[] milestoneBudgets, uint256[] milestoneDurations, uint256 estimatedSalePrice) returns (address projectAddress)",
];

export const FENRIR_PROJECT_ABI: string[] = [
  // events
  "event Invested(address indexed investor, uint256 amount)",
  "event ArbiterElectionStarted(uint256 proposalId)",
  "event FundingRoundClosed(uint256 totalRaised)",
  "event ArbiterElected(address indexed newArbiter)",
  "event MilestoneDeclared(uint256 indexed milestoneId, bytes32 reportHash, string reportUrl)",
  "event MilestoneVotingOpened(uint256 indexed milestoneId, uint256 proposalId)",
  "event MilestoneVotingPaused(uint256 indexed milestoneId)",
  "event MilestoneApproved(uint256 indexed milestoneId)",
  "event MilestoneRejected(uint256 indexed milestoneId, uint8 retryCount)",
  "event TrancheReleased(uint256 indexed milestoneId, uint256 amount)",
  "event TrancheReleasePending(uint256 indexed milestoneId)",
  "event SaleStageOpened()",
  "event SaleOfferSubmitted(uint256 indexed offerId, address indexed buyer, uint256 amount, uint256 proposalId)",
  "event SaleOfferApproved(uint256 indexed offerId, uint256 amount)",
  "event SaleOfferRefunded(uint256 indexed offerId, uint256 amount)",
  "event SaleExecuted(uint256 indexed offerId, uint256 salePrice)",
  "event ProjectCompleted()",
  "event ProjectCancelled(uint256 refundPool)",
  "event RefundClaimed(address indexed investor, uint256 amount)",
  "event DistributionClaimed(address indexed investor, uint256 amount)",
  "event CommissionClaimed(uint256 amount)",
  // views
  "function projectType() view returns (uint8)",
  "function status() view returns (uint8)",
  "function fmpa() view returns (uint256)",
  "function ff() view returns (uint256)",
  "function fundingDeadline() view returns (uint256)",
  "function estimatedSalePrice() view returns (uint256)",
  "function totalRaised() view returns (uint256)",
  "function totalReleasedToDeveloper() view returns (uint256)",
  "function penaltyAccumulatedBps() view returns (uint256)",
  "function currentMilestoneIndex() view returns (uint256)",
  "function salePrice() view returns (uint256)",
  "function distributionPool() view returns (uint256)",
  "function refundPool() view returns (uint256)",
  "function milestonesCount() view returns (uint256)",
  "function milestones(uint256) view returns (uint256 budget, uint256 deadline, uint8 retryCount, bool trancheReleased, uint8 status, bytes32 reportHash, string reportUrl, uint256 proposalId)",
  "function milestoneDurations(uint256) view returns (uint256)",
  "function developer() view returns (address)",
  "function token() view returns (address)",
  "function governor() view returns (address)",
  "function saleOffers(uint256) view returns (address buyer, uint256 amount, uint256 proposalId, uint8 status)",
  // writes
  "function invest() payable",
  "function declareMilestone(bytes32 reportHash, string reportUrl)",
  "function submitOffer() payable returns (uint256 offerId)",
  "function executeSale()",
  "function claimRefund()",
  "function claimDistribution()",
  "function claimCommission()",
  // mantenimiento / casos borde
  "function cancelExpiredFunding()",
  "function cancelStalledMilestone()",
  "function pokeFundingGates()",
];

export const FENRIR_GOVERNOR_ABI: string[] = [
  // events
  "event ProposalCreated(uint256 indexed proposalId, uint8 kind, uint256 refId, uint256 snapshotBlock, uint256 deadline)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, uint256 weight)",
  "event ProposalExtended(uint256 indexed proposalId, uint256 newDeadline)",
  "event ProposalAwaitingArbiter(uint256 indexed proposalId)",
  "event ProposalResolved(uint256 indexed proposalId, uint8 result)",
  "event ArbiterElected(address indexed arbiter, bool byRandom)",
  "event ArbiterVacated(address indexed formerArbiter)",
  // views
  "function votingMode() view returns (uint8)",
  "function arbiter() view returns (address)",
  "function proposals(uint256) view returns (uint8 kind, uint256 refId, uint256 snapshotBlock, uint256 totalPowerAtSnapshot, uint256 deadline, bool extended, uint256 votesFor, uint256 votesAgainst, uint256 weightVoted, uint8 status, uint8 result, address leadingCandidate, uint256 leadingVotes, bool tie)",
  // writes
  "function castVote(uint256 proposalId, bool support)",
  "function castDeveloperSaleVote(uint256 proposalId, bool support)",
  "function castElectionVote(uint256 proposalId, address candidate)",
  "function resolve(uint256 proposalId)",
  "function arbiterDecide(uint256 proposalId, bool approve)",
];

export const FENRIR_TOKEN_ABI: string[] = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function getPastVotes(address account, uint256 timepoint) view returns (uint256)",
  "function getPastTotalSupply(uint256 timepoint) view returns (uint256)",
  "function holdersCount() view returns (uint256)",
  "function holderAt(uint256 index) view returns (address)",
  // write (transferencia FDT; la delegacion es automatica on-chain en _update)
  "function transfer(address to, uint256 amount) returns (bool)",
];
