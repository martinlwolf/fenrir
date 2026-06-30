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

  // Cantidad de inversores DISTINTOS por proyecto, para un conjunto de direcciones. Una sola
  // query: `distinct` colapsa los pares (proyecto, wallet) repetidos y se cuenta por proyecto.
  async countDistinctInvestorsByProjects(addresses: string[]): Promise<Map<string, number>> {
    if (addresses.length === 0) return new Map();
    const rows = await this.db.investment.findMany({
      where: { projectAddress: { in: addresses.map((a) => a.toLowerCase()) } },
      distinct: ["projectAddress", "investorWallet"],
      select: { projectAddress: true },
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      counts.set(r.projectAddress, (counts.get(r.projectAddress) ?? 0) + 1);
    }
    return counts;
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
