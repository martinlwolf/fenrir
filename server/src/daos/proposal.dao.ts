// DAO de propuestas: unica capa que toca Prisma para Proposal.
import type {
  ProposalKindValue,
  ProposalResultValue,
  ProposalStatusValue,
} from "@shared/constants/enums";
import { Proposal } from "../models/Proposal";
import { prisma } from "./prisma";

type ProposalRow = {
  id: number;
  projectAddress: string;
  governorProposalId: number;
  kind: ProposalKindValue;
  refId: number;
  snapshotBlock: bigint;
  totalPowerAtSnapshot: { toString(): string };
  deadline: Date;
  extended: boolean;
  votesFor: { toString(): string };
  votesAgainst: { toString(): string };
  weightVoted: { toString(): string };
  status: ProposalStatusValue;
  result: ProposalResultValue;
  electedArbiter: string | null;
};

function toModel(row: ProposalRow): Proposal {
  return new Proposal({
    governorProposalId: row.governorProposalId,
    kind: row.kind,
    refId: row.refId,
    snapshotBlock: row.snapshotBlock,
    totalPowerAtSnapshot: BigInt(row.totalPowerAtSnapshot.toString()),
    deadline: row.deadline,
    extended: row.extended,
    votesFor: BigInt(row.votesFor.toString()),
    votesAgainst: BigInt(row.votesAgainst.toString()),
    weightVoted: BigInt(row.weightVoted.toString()),
    status: row.status,
    result: row.result,
    electedArbiter: row.electedArbiter,
  });
}

export interface ProposalRowInput {
  projectAddress: string;
  governorProposalId: number;
  kind: ProposalKindValue;
  refId: number;
  snapshotBlock: bigint;
  totalPowerAtSnapshot: bigint;
  deadline: Date;
  extended: boolean;
  votesFor: bigint;
  votesAgainst: bigint;
  weightVoted: bigint;
  status: ProposalStatusValue;
  result: ProposalResultValue;
  electedArbiter: string | null;
}

export async function upsertProposalRow(input: ProposalRowInput): Promise<void> {
  const project = input.projectAddress.toLowerCase();
  const data = {
    kind: input.kind,
    refId: input.refId,
    snapshotBlock: input.snapshotBlock,
    totalPowerAtSnapshot: input.totalPowerAtSnapshot.toString(),
    deadline: input.deadline,
    extended: input.extended,
    votesFor: input.votesFor.toString(),
    votesAgainst: input.votesAgainst.toString(),
    weightVoted: input.weightVoted.toString(),
    status: input.status,
    result: input.result,
    electedArbiter: input.electedArbiter ? input.electedArbiter.toLowerCase() : null,
  };

  await prisma.proposal.upsert({
    where: {
      projectAddress_governorProposalId: {
        projectAddress: project,
        governorProposalId: input.governorProposalId,
      },
    },
    create: { projectAddress: project, governorProposalId: input.governorProposalId, ...data },
    update: data,
  });
}

export async function listByProject(projectAddress: string): Promise<Proposal[]> {
  const rows = await prisma.proposal.findMany({
    where: { projectAddress: projectAddress.toLowerCase() },
    orderBy: { governorProposalId: "asc" },
  });
  return rows.map(toModel);
}

export async function findByProjectAndProposalId(
  projectAddress: string,
  governorProposalId: number,
): Promise<Proposal | null> {
  const row = await prisma.proposal.findUnique({
    where: {
      projectAddress_governorProposalId: {
        projectAddress: projectAddress.toLowerCase(),
        governorProposalId,
      },
    },
  });
  return row ? toModel(row) : null;
}

export async function getMeta(
  projectAddress: string,
  governorProposalId: number,
): Promise<{ id: number; snapshotBlock: bigint } | null> {
  const row = await prisma.proposal.findUnique({
    where: {
      projectAddress_governorProposalId: {
        projectAddress: projectAddress.toLowerCase(),
        governorProposalId,
      },
    },
    select: { id: true, snapshotBlock: true },
  });
  return row ? { id: row.id, snapshotBlock: row.snapshotBlock } : null;
}

// Hay una eleccion de arbitro activa o esperando resolucion (hito 0, vacancia o
// re-eleccion en curso).
export async function hasActiveArbiterElection(projectAddress: string): Promise<boolean> {
  const count = await prisma.proposal.count({
    where: {
      projectAddress: projectAddress.toLowerCase(),
      kind: "ArbiterElection",
      status: { not: "Resolved" },
    },
  });
  return count > 0;
}
