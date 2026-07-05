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

// Fila del directorio: identidad + conteo de su historico de reputacion (certificados de
// finalizacion / proyecto fallido). El orden/filtro/paginado los aplica el servicio.
export interface DeveloperWithReputation {
  wallet: string;
  razonSocial: string;
  cuit: string;
  completed: number;
  failed: number;
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

  // Todos los developers enriquecidos con su conteo de certificados. Una sola pasada por
  // certificados (groupBy) en vez de N+1 por developer. El conteo es chico (proyecto de
  // seminario): el orden/filtro/paginado se resuelve en el servicio sobre este resultado.
  async listWithReputation(): Promise<DeveloperWithReputation[]> {
    const [devs, grouped] = await Promise.all([
      this.db.developer.findMany({
        select: { wallet: true, razonSocial: true, cuit: true },
      }),
      this.db.reputationCertificate.groupBy({
        by: ["developerWallet", "type"],
        _count: { _all: true },
      }),
    ]);

    const counts = new Map<string, { completed: number; failed: number }>();
    for (const g of grouped) {
      const entry = counts.get(g.developerWallet) ?? { completed: 0, failed: 0 };
      if (g.type === "Completion") entry.completed = g._count._all;
      else entry.failed = g._count._all;
      counts.set(g.developerWallet, entry);
    }

    return devs.map((d) => ({
      wallet: d.wallet,
      razonSocial: d.razonSocial,
      cuit: d.cuit,
      completed: counts.get(d.wallet)?.completed ?? 0,
      failed: counts.get(d.wallet)?.failed ?? 0,
    }));
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
