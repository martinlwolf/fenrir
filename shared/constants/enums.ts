// Constantes de shape compartidas entre client/ y server/. Espejan exactamente los
// enums de los contratos en /contracts. SIN logica de negocio (ver constitution
// Principio II/III): solo los valores de estado/tipo que ambos lados nombran igual.

export const PROJECT_TYPE = ["Investment", "Civic"] as const;
export type ProjectTypeValue = (typeof PROJECT_TYPE)[number];

export const PROJECT_STATUS = [
  "Funding",
  "Building",
  "Selling",
  "Completed",
  "Cancelled",
] as const;
export type ProjectStatusValue = (typeof PROJECT_STATUS)[number];

export const MILESTONE_STATUS = [
  "Pending",
  "Declared",
  "Voting",
  "Approved",
  "Rejected",
] as const;
export type MilestoneStatusValue = (typeof MILESTONE_STATUS)[number];

export const OFFER_STATUS = [
  "Voting",
  "Approved",
  "Rejected",
  "Refunded",
  "Executed",
] as const;
export type OfferStatusValue = (typeof OFFER_STATUS)[number];

export const VOTING_MODE = ["ByToken", "OneWalletOneVote"] as const;
export type VotingModeValue = (typeof VOTING_MODE)[number];

export const PROPOSAL_KIND = ["ArbiterElection", "Milestone", "SaleOffer"] as const;
export type ProposalKindValue = (typeof PROPOSAL_KIND)[number];

export const PROPOSAL_STATUS = ["Active", "AwaitingArbiter", "Resolved"] as const;
export type ProposalStatusValue = (typeof PROPOSAL_STATUS)[number];

export const PROPOSAL_RESULT = ["None", "Approved", "Rejected"] as const;
export type ProposalResultValue = (typeof PROPOSAL_RESULT)[number];

export const CERTIFICATE_TYPE = ["Completion", "Failure"] as const;
export type CertificateTypeValue = (typeof CERTIFICATE_TYPE)[number];

export const CLAIM_TYPE = ["Refund", "Distribution"] as const;
export type ClaimTypeValue = (typeof CLAIM_TYPE)[number];
