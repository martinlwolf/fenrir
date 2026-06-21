// DAO de certificados de reputacion: unica capa que toca Prisma para
// ReputationCertificate.
import type { CertificateTypeValue } from "@shared/constants/enums";
import { ReputationCertificate } from "../models/ReputationCertificate";
import { prisma } from "./prisma";

export interface RecordCertificateInput {
  type: CertificateTypeValue;
  developerWallet: string;
  projectAddress: string;
  mintedAtBlock: bigint;
}

// Registra un certificado. El tokenId on-chain se asigna por secuencia global por tipo
// (nextTokenId del contrato arranca en 1 y crece por mint); como los eventos se
// procesan en orden cronologico, replicamos esa secuencia con el conteo existente.
// Idempotente: un proyecto produce a lo sumo un certificado por tipo.
export async function record(input: RecordCertificateInput): Promise<void> {
  const project = input.projectAddress.toLowerCase();
  const developer = input.developerWallet.toLowerCase();

  const existing = await prisma.reputationCertificate.findFirst({
    where: { projectAddress: project, type: input.type },
  });
  if (existing) return;

  const tokenId = (await prisma.reputationCertificate.count({ where: { type: input.type } })) + 1;

  await prisma.reputationCertificate.create({
    data: {
      type: input.type,
      developerWallet: developer,
      tokenId,
      projectAddress: project,
      mintedAtBlock: input.mintedAtBlock,
    },
  });
}

export async function listByDeveloper(wallet: string): Promise<ReputationCertificate[]> {
  const rows = await prisma.reputationCertificate.findMany({
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
