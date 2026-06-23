// Repositorio de inversiones: unica capa que toca Prisma para Investment.
import type { PrismaClient } from "@prisma/client";
import { Investment } from "../../models/Investment";
import { prisma } from "./prisma";

export interface InvestmentRowInput {
  projectAddress: string;
  investorWallet: string;
  amount: bigint;
  txHash: string;
  logIndex: number;
  block: bigint;
}

export class InvestmentRepository {
  constructor(private readonly db: PrismaClient = prisma) { }

  // Inserta una inversion. La unicidad (txHash, logIndex) + applyOnce garantizan que
  // nunca se duplique aunque el evento se reprocese.
  async insertInvestment(input: InvestmentRowInput): Promise<void> {
    await this.db.investment.create({
      data: {
        projectAddress: input.projectAddress.toLowerCase(),
        investorWallet: input.investorWallet.toLowerCase(),
        amount: input.amount.toString(),
        txHash: input.txHash,
        logIndex: input.logIndex,
        block: input.block,
      },
    });
  }

  // Direcciones de proyectos distintos en los que invirtio una wallet.
  async listProjectsByInvestor(wallet: string): Promise<string[]> {
    const rows = await this.db.investment.findMany({
      where: { investorWallet: wallet.toLowerCase() },
      distinct: ["projectAddress"],
      select: { projectAddress: true },
    });
    return rows.map((r) => r.projectAddress);
  }

  // Wallets distintas que invirtieron en un proyecto.
  async listInvestorsByProject(projectAddress: string): Promise<string[]> {
    const rows = await this.db.investment.findMany({
      where: { projectAddress: projectAddress.toLowerCase() },
      distinct: ["investorWallet"],
      select: { investorWallet: true },
    });
    return rows.map((r) => r.investorWallet);
  }

  async listByInvestor(wallet: string): Promise<Investment[]> {
    const rows = await this.db.investment.findMany({
      where: { investorWallet: wallet.toLowerCase() },
      orderBy: { block: "desc" },
    });
    return rows.map(
      (r) =>
        new Investment({
          projectAddress: r.projectAddress,
          investorWallet: r.investorWallet,
          amount: BigInt(r.amount.toString()),
          txHash: r.txHash,
          block: r.block,
        }),
    );
  }
}

export const investmentRepository = new InvestmentRepository();
