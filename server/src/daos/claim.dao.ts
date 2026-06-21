// DAO de reclamos: unica capa que toca Prisma para Claim (registro historico de
// reembolsos/repartos reclamados). Lo "reclamable hoy" se calcula on-chain, no de aca.
import type { ClaimTypeValue } from "@shared/constants/enums";
import { prisma } from "./prisma";

export interface ClaimRowInput {
  projectAddress: string;
  investorWallet: string;
  type: ClaimTypeValue;
  amount: bigint;
  txHash: string;
  logIndex: number;
  block: bigint;
}

export async function insertClaim(input: ClaimRowInput): Promise<void> {
  await prisma.claim.create({
    data: {
      projectAddress: input.projectAddress.toLowerCase(),
      investorWallet: input.investorWallet.toLowerCase(),
      type: input.type,
      amount: input.amount.toString(),
      txHash: input.txHash,
      logIndex: input.logIndex,
      block: input.block,
    },
  });
}
