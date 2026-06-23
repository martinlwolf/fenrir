// Repositorio de ofertas de venta: unica capa que toca Prisma para SaleOffer.
import type { PrismaClient } from "@prisma/client";
import type { OfferStatusValue } from "@shared/constants/enums";
import { SaleOffer } from "../../models/SaleOffer";
import { prisma } from "./prisma";

export interface SaleOfferRowInput {
  projectAddress: string;
  offerId: number;
  buyerWallet: string;
  amount: bigint;
  proposalId: number | null;
  status: OfferStatusValue;
}

export class SaleOfferRepository {
  constructor(private readonly db: PrismaClient = prisma) { }

  async upsertOfferRow(input: SaleOfferRowInput): Promise<void> {
    const project = input.projectAddress.toLowerCase();
    const data = {
      buyerWallet: input.buyerWallet.toLowerCase(),
      amount: input.amount.toString(),
      proposalId: input.proposalId,
      status: input.status,
    };
    await this.db.saleOffer.upsert({
      where: {
        projectAddress_offerId: { projectAddress: project, offerId: input.offerId },
      },
      create: { projectAddress: project, offerId: input.offerId, ...data },
      update: data,
    });
  }

  async listByProject(projectAddress: string): Promise<SaleOffer[]> {
    const rows = await this.db.saleOffer.findMany({
      where: { projectAddress: projectAddress.toLowerCase() },
      orderBy: { offerId: "asc" },
    });
    return rows.map(
      (r) =>
        new SaleOffer({
          offerId: r.offerId,
          buyerWallet: r.buyerWallet,
          amount: BigInt(r.amount.toString()),
          proposalId: r.proposalId,
          status: r.status,
        }),
    );
  }
}

export const saleOfferRepository = new SaleOfferRepository();
