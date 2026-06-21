// DAO de reportes de hito: unica capa que toca Prisma para MilestoneReport.
import { MilestoneReport } from "../models/MilestoneReport";
import { prisma } from "./prisma";

type ReportRow = {
  id: number;
  milestoneId: number | null;
  projectAddress: string;
  milestoneIndex: number;
  text: string;
  mediaUrls: string[];
  documentUrls: string[];
  computedHash: string;
  onChainHash: string | null;
  hashMatch: boolean | null;
  storageRef: string;
  createdByWallet: string;
};

function toModel(row: ReportRow): MilestoneReport {
  return new MilestoneReport({
    id: row.id,
    projectAddress: row.projectAddress,
    milestoneIndex: row.milestoneIndex,
    text: row.text,
    mediaUrls: row.mediaUrls,
    documentUrls: row.documentUrls,
    computedHash: row.computedHash,
    onChainHash: row.onChainHash,
    hashMatch: row.hashMatch,
    storageRef: row.storageRef,
    createdByWallet: row.createdByWallet,
  });
}

export interface CreateReportInput {
  projectAddress: string;
  milestoneIndex: number;
  text: string;
  mediaUrls: string[];
  documentUrls: string[];
  computedHash: string;
  storageRef: string;
  createdByWallet: string;
}

export async function create(input: CreateReportInput): Promise<MilestoneReport> {
  const row = await prisma.milestoneReport.create({
    data: {
      projectAddress: input.projectAddress.toLowerCase(),
      milestoneIndex: input.milestoneIndex,
      text: input.text,
      mediaUrls: input.mediaUrls,
      documentUrls: input.documentUrls,
      computedHash: input.computedHash,
      storageRef: input.storageRef,
      createdByWallet: input.createdByWallet.toLowerCase(),
    },
  });
  return toModel(row);
}

export async function findById(id: number): Promise<MilestoneReport | null> {
  const row = await prisma.milestoneReport.findUnique({ where: { id } });
  return row ? toModel(row) : null;
}

// Busca el reporte mas reciente para un (proyecto, hito) cuyo hash computado
// coincide con el hash on-chain -- usado al observar MilestoneDeclared.
export async function findByProjectMilestoneAndHash(
  projectAddress: string,
  milestoneIndex: number,
  computedHash: string,
): Promise<{ id: number } | null> {
  return prisma.milestoneReport.findFirst({
    where: {
      projectAddress: projectAddress.toLowerCase(),
      milestoneIndex,
      computedHash,
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
}

// Enlaza el reporte al milestone y registra el resultado de la verificacion de hash
// (FR-009). Tambien se usa para marcar discrepancias.
export async function linkAndVerify(
  reportId: number,
  milestoneId: number | null,
  onChainHash: string,
  hashMatch: boolean,
): Promise<void> {
  await prisma.milestoneReport.update({
    where: { id: reportId },
    data: { milestoneId, onChainHash, hashMatch },
  });
}

// Registra una declaracion on-chain sin reporte off-chain conocido (discrepancia: el
// hash on-chain no coincide con ningun contenido almacenado).
export async function recordOrphanDeclaration(
  projectAddress: string,
  milestoneIndex: number,
  onChainHash: string,
): Promise<void> {
  await prisma.milestoneReport.create({
    data: {
      projectAddress: projectAddress.toLowerCase(),
      milestoneIndex,
      text: "",
      mediaUrls: [],
      documentUrls: [],
      computedHash: "",
      onChainHash,
      hashMatch: false,
      storageRef: "",
      createdByWallet: "",
    },
  });
}
