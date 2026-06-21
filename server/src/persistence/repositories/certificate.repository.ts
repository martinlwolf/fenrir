// Repositorio de certificados de reputacion: unica capa que toca Prisma para
// ReputationCertificate.
import type { PrismaClient } from "@prisma/client";
import type { CertificateTypeValue } from "@shared/constants/enums";
import { ReputationCertificate } from "../../models/ReputationCertificate";
import { prisma } from "./prisma";

export interface RecordCertificateInput {
  type: CertificateTypeValue;
  developerWallet: string;
  projectAddress: string;
  mintedAtBlock: bigint;
}

export class CertificateRepository {
  constructor(private readonly db: PrismaClient = prisma) { }

  // Registra un certificado. El tokenId on-chain se asigna por secuencia global por
  // tipo (nextTokenId del contrato arranca en 1 y crece por mint); como los eventos se
  // procesan en orden cronologico, replicamos esa secuencia con el conteo existente.
  // Idempotente: un proyecto produce a lo sumo un certificado por tipo.
  async record(input: RecordCertificateInput): Promise<void> {
    const project = input.projectAddress.toLowerCase();
    const developer = input.developerWallet.toLowerCase();

    const existing = await this.db.reputationCertificate.findFirst({
      where: { projectAddress: project, type: input.type },
    });
    if (existing) return;

    const tokenId =
      (await this.db.reputationCertificate.count({ where: { type: input.type } })) + 1;

    await this.db.reputationCertificate.create({
      data: {
        type: input.type,
        developerWallet: developer,
        tokenId,
        projectAddress: project,
        mintedAtBlock: input.mintedAtBlock,
      },
    });
  }

  async listByDeveloper(wallet: string): Promise<ReputationCertificate[]> {
    const rows = await this.db.reputationCertificate.findMany({
      where: { developerWallet: wallet.toLowerCase() },
      orderBy: { mintedAtBlock: "asc" },
    });
    return rows.map(
      (r) =>
        new ReputationCertificate({
          type: r.type,
          tokenId: r.tokenId,
          projectAddress: r.projectAddress,
          mintedAtBlock: r.mintedAtBlock,
        }),
    );
  }
}

export const certificateRepository = new CertificateRepository();
