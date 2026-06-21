// DAO de hitos: unica capa que toca Prisma para Milestone. Usado por la
// sincronizacion on-chain (upsert por (projectAddress, milestoneIndex)) y por el
// servicio de reportes (enlace report <-> milestone).
import type { MilestoneStatusValue } from "@shared/constants/enums";
import { prisma } from "./prisma";

export interface MilestoneRowInput {
  projectAddress: string;
  milestoneIndex: number;
  budget: bigint;
  deadline: Date | null;
  status: MilestoneStatusValue;
  retryCount: number;
  trancheReleased: boolean;
  reportHash: string | null;
  reportUrl: string | null;
  proposalId: number | null;
}

export async function upsertMilestoneRow(input: MilestoneRowInput): Promise<void> {
  const project = input.projectAddress.toLowerCase();
  const data = {
    budget: input.budget.toString(),
    deadline: input.deadline,
    status: input.status,
    retryCount: input.retryCount,
    trancheReleased: input.trancheReleased,
    reportHash: input.reportHash,
    reportUrl: input.reportUrl,
    proposalId: input.proposalId,
  };

  await prisma.milestone.upsert({
    where: {
      projectAddress_milestoneIndex: {
        projectAddress: project,
        milestoneIndex: input.milestoneIndex,
      },
    },
    create: { projectAddress: project, milestoneIndex: input.milestoneIndex, ...data },
    update: data,
  });
}

export async function findId(
  projectAddress: string,
  milestoneIndex: number,
): Promise<number | null> {
  const row = await prisma.milestone.findUnique({
    where: {
      projectAddress_milestoneIndex: {
        projectAddress: projectAddress.toLowerCase(),
        milestoneIndex,
      },
    },
    select: { id: true },
  });
  return row ? row.id : null;
}
