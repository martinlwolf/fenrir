// DAO de votos: unica capa que toca Prisma para Vote. Los votos se reflejan como
// registros write-only (el conteo agregado vive en Proposal); no tienen DTO de lectura
// individual, por eso este DAO opera con primitivas.
import { prisma } from "./prisma";

export interface VoteRowInput {
  proposalInternalId: number;
  voterWallet: string;
  weight: bigint;
  support: boolean | null;
  candidate: string | null;
  txHash: string;
  logIndex: number;
  block: bigint;
}

export async function insertVote(input: VoteRowInput): Promise<void> {
  await prisma.vote.create({
    data: {
      proposalId: input.proposalInternalId,
      voterWallet: input.voterWallet.toLowerCase(),
      weight: input.weight.toString(),
      support: input.support,
      candidate: input.candidate ? input.candidate.toLowerCase() : null,
      txHash: input.txHash,
      logIndex: input.logIndex,
      block: input.block,
    },
  });
}

export async function hasVoted(proposalInternalId: number, wallet: string): Promise<boolean> {
  const found = await prisma.vote.findUnique({
    where: {
      proposalId_voterWallet: {
        proposalId: proposalInternalId,
        voterWallet: wallet.toLowerCase(),
      },
    },
  });
  return found !== null;
}
