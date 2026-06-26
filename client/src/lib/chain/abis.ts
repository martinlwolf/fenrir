// ABIs human-readable (ethers v6) de las funciones que el frontend FIRMA. Solo se incluyen
// las funciones de escritura usadas; el estado se lee siempre desde la API del backend, no
// de la cadena. Si cambia un contrato, se actualiza la firma correspondiente aca.
// (El repo no compila contratos -- deploy manual por Remix, constitution Principio IV.)

export const FENRIR_FACTORY_ABI = [
  "function registerDeveloper(string razonSocial, string cuit)",
  "function createProject(string tokenName, string tokenSymbol, uint8 projectType, uint8 votingMode, uint256 fmpa, uint256 ff, uint256 fundingDeadline, uint256[] milestoneBudgets, uint256[] milestoneDurations, uint256 estimatedSalePrice) returns (address projectAddress)",
] as const;

export const FENRIR_PROJECT_ABI = [
  "function invest() payable",
  "function declareMilestone(bytes32 reportHash, string reportUrl)",
  "function submitOffer() payable returns (uint256 offerId)",
  "function executeSale()",
  "function claimRefund()",
  "function claimDistribution()",
  "function claimCommission()",
] as const;

export const FENRIR_GOVERNOR_ABI = [
  "function castVote(uint256 proposalId, bool support)",
  "function castDeveloperSaleVote(uint256 proposalId, bool support)",
  "function castElectionVote(uint256 proposalId, address candidate)",
  "function resolve(uint256 proposalId)",
  "function arbiterDecide(uint256 proposalId, bool approve)",
] as const;
