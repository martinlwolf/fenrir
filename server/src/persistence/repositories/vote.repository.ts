// Repositorio de votos: unica capa que toca Prisma para Vote. Los votos se reflejan como
// registros write-only (el conteo agregado vive en Proposal); no tienen DTO de lectura
// individual, por eso este repositorio opera con primitivas.
import type { PrismaClient } from "@prisma/client";
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

export class VoteRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async insertVote(input: VoteRowInput): Promise<void> {
    await this.db.vote.create({
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

  async hasVoted(proposalInternalId: number, wallet: string): Promise<boolean> {
    const found = await this.db.vote.findUnique({
      where: {
        proposalId_voterWallet: {
          proposalId: proposalInternalId,
          voterWallet: wallet.toLowerCase(),
        },
      },
    });
    return found !== null;
  }
}

export const voteRepository = new VoteRepository();
