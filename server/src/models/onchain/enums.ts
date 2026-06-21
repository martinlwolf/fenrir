// Mapeo de los enums uint8 de los contratos a los string unions del espejo. El
// orden DEBE coincidir con el de los enum en /contracts.
import type {
  MilestoneStatusValue,
  OfferStatusValue,
  ProjectStatusValue,
  ProjectTypeValue,
  ProposalKindValue,
  ProposalResultValue,
  ProposalStatusValue,
  VotingModeValue,
} from "@shared/constants/enums";

const PROJECT_TYPE: ProjectTypeValue[] = ["Investment", "Civic"];
const PROJECT_STATUS: ProjectStatusValue[] = [
  "Funding",
  "Building",
  "Selling",
  "Completed",
  "Cancelled",
];
const MILESTONE_STATUS: MilestoneStatusValue[] = [
  "Pending",
  "Declared",
  "Voting",
  "Approved",
  "Rejected",
];
const OFFER_STATUS: OfferStatusValue[] = [
  "Voting",
  "Approved",
  "Rejected",
  "Refunded",
  "Executed",
];
const VOTING_MODE: VotingModeValue[] = ["ByToken", "OneWalletOneVote"];
const PROPOSAL_KIND: ProposalKindValue[] = ["ArbiterElection", "Milestone", "SaleOffer"];
const PROPOSAL_STATUS: ProposalStatusValue[] = ["Active", "AwaitingArbiter", "Resolved"];
const PROPOSAL_RESULT: ProposalResultValue[] = ["None", "Approved", "Rejected"];

function at<T>(arr: T[], idx: number | bigint, label: string): T {
  const i = Number(idx);
  const v = arr[i];
  if (v === undefined) throw new Error(`Valor de enum ${label} fuera de rango: ${i}`);
  return v;
}

export const toProjectType = (v: number | bigint): ProjectTypeValue =>
  at(PROJECT_TYPE, v, "ProjectType");
export const toProjectStatus = (v: number | bigint): ProjectStatusValue =>
  at(PROJECT_STATUS, v, "ProjectStatus");
export const toMilestoneStatus = (v: number | bigint): MilestoneStatusValue =>
  at(MILESTONE_STATUS, v, "MilestoneStatus");
export const toOfferStatus = (v: number | bigint): OfferStatusValue =>
  at(OFFER_STATUS, v, "OfferStatus");
export const toVotingMode = (v: number | bigint): VotingModeValue =>
  at(VOTING_MODE, v, "VotingMode");
export const toProposalKind = (v: number | bigint): ProposalKindValue =>
  at(PROPOSAL_KIND, v, "ProposalKind");
export const toProposalStatus = (v: number | bigint): ProposalStatusValue =>
  at(PROPOSAL_STATUS, v, "ProposalStatus");
export const toProposalResult = (v: number | bigint): ProposalResultValue =>
  at(PROPOSAL_RESULT, v, "ProposalResult");
