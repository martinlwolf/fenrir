// DAO de proyectos: unica capa que toca Prisma para Project (+ lectura de sus
// milestones para el detalle). Recibe/devuelve modelos de negocio, no filas crudas.
import type { Prisma } from "@prisma/client";
import type {
  ProjectStatusValue,
  ProjectTypeValue,
  VotingModeValue,
} from "@shared/constants/enums";
import { Milestone } from "../models/Milestone";
import { Project } from "../models/Project";
import { prisma } from "./prisma";

// Forma escalar completa de un proyecto, usada por la sincronizacion on-chain.
export interface ProjectRowInput {
  address: string;
  tokenAddress: string;
  governorAddress: string;
  developerWallet: string;
  projectType: ProjectTypeValue;
  votingMode: VotingModeValue;
  status: ProjectStatusValue;
  fmpa: bigint;
  ff: bigint;
  totalRaised: bigint;
  totalReleasedToDeveloper: bigint;
  estimatedSalePrice: bigint;
  salePrice: bigint | null;
  fundingDeadline: Date;
  penaltyAccumulatedBps: number;
  currentArbiter: string | null;
  currentMilestoneIndex: number;
  // Solo se usa al crear la fila; en updates se preserva el valor existente.
  createdAtBlock?: bigint;
}

type ProjectRow = Prisma.ProjectGetPayload<{ include: { milestones: true } }>;

function toModel(row: ProjectRow): Project {
  const milestones = [...row.milestones]
    .sort((a, b) => a.milestoneIndex - b.milestoneIndex)
    .map(
      (m) =>
        new Milestone({
          milestoneIndex: m.milestoneIndex,
          budget: BigInt(m.budget.toString()),
          deadline: m.deadline,
          status: m.status,
          retryCount: m.retryCount,
          trancheReleased: m.trancheReleased,
          reportHash: m.reportHash,
          reportUrl: m.reportUrl,
          proposalId: m.proposalId,
        }),
    );

  return new Project(
    {
      address: row.address,
      tokenAddress: row.tokenAddress,
      governorAddress: row.governorAddress,
      developerWallet: row.developerWallet,
      projectType: row.projectType,
      votingMode: row.votingMode,
      status: row.status,
      fmpa: BigInt(row.fmpa.toString()),
      ff: BigInt(row.ff.toString()),
      totalRaised: BigInt(row.totalRaised.toString()),
      totalReleasedToDeveloper: BigInt(row.totalReleasedToDeveloper.toString()),
      estimatedSalePrice: BigInt(row.estimatedSalePrice.toString()),
      salePrice: row.salePrice !== null ? BigInt(row.salePrice.toString()) : null,
      fundingDeadline: row.fundingDeadline,
      penaltyAccumulatedBps: row.penaltyAccumulatedBps,
      currentArbiter: row.currentArbiter,
      currentMilestoneIndex: row.currentMilestoneIndex,
    },
    milestones,
  );
}

export async function findByAddress(address: string): Promise<Project | null> {
  const row = await prisma.project.findUnique({
    where: { address: address.toLowerCase() },
    include: { milestones: true },
  });
  return row ? toModel(row) : null;
}

export interface ListFilter {
  type?: ProjectTypeValue;
  status?: ProjectStatusValue;
  page: number;
  pageSize: number;
}

export async function list(filter: ListFilter): Promise<{ items: Project[]; total: number }> {
  const where: Prisma.ProjectWhereInput = {};
  if (filter.type) where.projectType = filter.type;
  if (filter.status) where.status = filter.status;

  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: { milestones: true },
      orderBy: { createdAtBlock: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.project.count({ where }),
  ]);

  return { items: rows.map(toModel), total };
}

// Vista de comprador: solo proyectos en etapa de venta (FR-004).
export async function listSelling(
  page: number,
  pageSize: number,
): Promise<{ items: Project[]; total: number }> {
  return list({ status: "Selling", page, pageSize });
}

// Direcciones que el listener debe escanear: cada proyecto + su governor.
export async function listSyncTargets(): Promise<
  { address: string; governorAddress: string }[]
> {
  return prisma.project.findMany({
    select: { address: true, governorAddress: true },
  });
}

export async function upsertProjectRow(input: ProjectRowInput): Promise<void> {
  const data = {
    tokenAddress: input.tokenAddress.toLowerCase(),
    governorAddress: input.governorAddress.toLowerCase(),
    developerWallet: input.developerWallet.toLowerCase(),
    projectType: input.projectType,
    votingMode: input.votingMode,
    status: input.status,
    fmpa: input.fmpa.toString(),
    ff: input.ff.toString(),
    totalRaised: input.totalRaised.toString(),
    totalReleasedToDeveloper: input.totalReleasedToDeveloper.toString(),
    estimatedSalePrice: input.estimatedSalePrice.toString(),
    salePrice: input.salePrice !== null ? input.salePrice.toString() : null,
    fundingDeadline: input.fundingDeadline,
    penaltyAccumulatedBps: input.penaltyAccumulatedBps,
    currentArbiter: input.currentArbiter ? input.currentArbiter.toLowerCase() : null,
    currentMilestoneIndex: input.currentMilestoneIndex,
  };

  await prisma.project.upsert({
    where: { address: input.address.toLowerCase() },
    // createdAtBlock solo se fija al crear; en update se preserva el valor existente.
    create: { address: input.address.toLowerCase(), createdAtBlock: input.createdAtBlock ?? 0n, ...data },
    update: data,
  });
}

export async function developerExists(wallet: string): Promise<boolean> {
  const found = await prisma.developer.findUnique({ where: { wallet: wallet.toLowerCase() } });
  return found !== null;
}

// Resuelve la direccion del proyecto a partir de la de su governor (los eventos de
// gobernanza los emite el governor).
export async function findAddressByGovernor(governorAddress: string): Promise<string | null> {
  const row = await prisma.project.findUnique({
    where: { governorAddress: governorAddress.toLowerCase() },
    select: { address: true },
  });
  return row ? row.address : null;
}

// Contexto necesario para calcular el poder de voto de una wallet.
export async function getVotingContext(
  projectAddress: string,
): Promise<{ tokenAddress: string; votingMode: VotingModeValue } | null> {
  const row = await prisma.project.findUnique({
    where: { address: projectAddress.toLowerCase() },
    select: { tokenAddress: true, votingMode: true },
  });
  return row ? { tokenAddress: row.tokenAddress, votingMode: row.votingMode } : null;
}
