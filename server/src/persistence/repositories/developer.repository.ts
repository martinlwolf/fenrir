// Repositorio de developers: unica capa que toca Prisma para Developer.
import type { PrismaClient } from "@prisma/client";
import { Developer } from "../../models/Developer";
import { prisma } from "./prisma";

export interface UpsertDeveloperInput {
  wallet: string;
  razonSocial: string;
  cuit: string;
  registeredAtBlock: bigint;
}

export class DeveloperRepository {
  constructor(private readonly db: PrismaClient = prisma) { }

  // Refleja DeveloperRegistered. La regla "1 wallet valida por CUIT" la impone el
  // contrato (FR-015); el espejo simplemente persiste lo que el evento comunica.
  async upsertFromRegistration(input: UpsertDeveloperInput): Promise<void> {
    const wallet = input.wallet.toLowerCase();
    await this.db.developer.upsert({
      where: { wallet },
      create: {
        wallet,
        razonSocial: input.razonSocial,
        cuit: input.cuit,
        registeredAtBlock: input.registeredAtBlock,
      },
      update: { razonSocial: input.razonSocial, cuit: input.cuit },
    });
  }

  async findByWallet(wallet: string): Promise<Developer | null> {
    const row = await this.db.developer.findUnique({ where: { wallet: wallet.toLowerCase() } });
    return row
      ? new Developer({
        wallet: row.wallet,
        razonSocial: row.razonSocial,
        cuit: row.cuit,
        verificationDocsUrl: row.verificationDocsUrl,
      })
      : null;
  }

  async setVerificationDocsUrl(wallet: string, url: string): Promise<void> {
    await this.db.developer.update({
      where: { wallet: wallet.toLowerCase() },
      data: { verificationDocsUrl: url },
    });
  }

  async getDeveloperWallet(projectAddress: string): Promise<string | null> {
    const row = await this.db.project.findUnique({
      where: { address: projectAddress.toLowerCase() },
      select: { developerWallet: true },
    });
    return row ? row.developerWallet : null;
  }
}

export const developerRepository = new DeveloperRepository();
