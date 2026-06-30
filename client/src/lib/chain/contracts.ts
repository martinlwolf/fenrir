// Funciones de dominio de escritura on-chain. Cada una arma un ethers.Contract con el
// signer del usuario y envia la tx. Devuelven el TransactionResponse para que useWrite
// espere la confirmacion. NINGUN componente llama esto directo: pasa por hooks.
import { Contract, type TransactionResponse } from "ethers";
import {
  PROJECT_STATUS,
  PROJECT_TYPE,
  VOTING_MODE,
  type ProjectTypeValue,
  type VotingModeValue,
} from "@shared/constants/enums";
import {
  FENRIR_FACTORY_ABI,
  FENRIR_GOVERNOR_ABI,
  FENRIR_PROJECT_ABI,
  FENRIR_TOKEN_ABI,
} from "@shared/chain/abis";
import { env } from "../env";
import { getProvider, getSigner } from "./provider";

async function factory(): Promise<Contract> {
  return new Contract(env.factoryAddress, FENRIR_FACTORY_ABI, await getSigner());
}
async function project(address: string): Promise<Contract> {
  return new Contract(address, FENRIR_PROJECT_ABI, await getSigner());
}
async function governor(address: string): Promise<Contract> {
  return new Contract(address, FENRIR_GOVERNOR_ABI, await getSigner());
}
async function token(address: string): Promise<Contract> {
  return new Contract(address, FENRIR_TOKEN_ABI, await getSigner());
}

// Contratos de SOLO LECTURA: usan el provider, no el signer. Sirven para leer estado on-chain
// directo, sin depender del backend espejo (que puede estar atrasado).
function factoryRead(): Contract {
  return new Contract(env.factoryAddress, FENRIR_FACTORY_ABI, getProvider());
}
function projectRead(address: string): Contract {
  return new Contract(address, FENRIR_PROJECT_ABI, getProvider());
}
function tokenRead(address: string): Contract {
  return new Contract(address, FENRIR_TOKEN_ABI, getProvider());
}

export interface OnchainDeveloper {
  /** La wallet está registrada como developer EN EL FACTORY ACTUAL (lo que valida createProject). */
  registered: boolean;
  razonSocial: string;
  cuit: string;
}

// Lee el registro de developer directo del factory configurado (env.factoryAddress). Es la
// fuente de verdad que usa createProject on-chain: si redeployás el factory, el backend espejo
// puede seguir diciendo "registrado" pero el factory nuevo no te conoce y createProject revierte.
export async function getOnchainDeveloper(wallet: string): Promise<OnchainDeveloper> {
  const d = await factoryRead().developers(wallet);
  return {
    registered: Boolean(d.registered),
    razonSocial: String(d.razonSocial),
    cuit: String(d.cuit),
  };
}

export interface RefundInfo {
  /** El proyecto esta cancelado on-chain (independiente del espejo del backend). */
  cancelled: boolean;
  /** ETH (wei) que la wallet puede reclamar ahora via claimRefund(). */
  claimable: bigint;
}

// Lee directo de la cadena si la wallet tiene un reembolso por reclamar en un proyecto
// cancelado. No pasa por el backend: funciona aunque el espejo no haya ingerido la cancelacion.
export async function getRefundInfo(projectAddress: string, wallet: string): Promise<RefundInfo> {
  const p = projectRead(projectAddress);
  const cancelled = PROJECT_STATUS[Number(await p.status())] === "Cancelled";
  if (!cancelled) return { cancelled: false, claimable: 0n };

  const t = tokenRead((await p.token()) as string);
  const [balance, supply, pool] = await Promise.all([
    t.balanceOf(wallet) as Promise<bigint>,
    t.totalSupply() as Promise<bigint>,
    p.refundPool() as Promise<bigint>,
  ]);
  const claimable = supply > 0n ? (pool * balance) / supply : 0n;
  return { cancelled: true, claimable };
}

// --- Factory ---

export async function registerDeveloper(
  razonSocial: string,
  cuit: string,
): Promise<TransactionResponse> {
  return (await factory()).registerDeveloper(razonSocial, cuit);
}

export interface CreateProjectInput {
  tokenName: string;
  tokenSymbol: string;
  projectType: ProjectTypeValue;
  votingMode: VotingModeValue;
  fmpa: bigint;
  ff: bigint;
  fundingDeadline: number; // unix seconds
  milestoneBudgets: bigint[];
  milestoneDurations: number[]; // seconds
  estimatedSalePrice: bigint;
}

export async function createProject(input: CreateProjectInput): Promise<TransactionResponse> {
  const c = await factory();
  return c.createProject(
    input.tokenName,
    input.tokenSymbol,
    PROJECT_TYPE.indexOf(input.projectType),
    VOTING_MODE.indexOf(input.votingMode),
    input.fmpa,
    input.ff,
    input.fundingDeadline,
    input.milestoneBudgets,
    input.milestoneDurations,
    input.estimatedSalePrice,
  );
}

// --- Project ---

export async function investInProject(
  projectAddress: string,
  amountWei: bigint,
): Promise<TransactionResponse> {
  return (await project(projectAddress)).invest({ value: amountWei });
}

export async function declareMilestone(
  projectAddress: string,
  reportHash: string,
  reportUrl: string,
): Promise<TransactionResponse> {
  return (await project(projectAddress)).declareMilestone(reportHash, reportUrl);
}

export async function submitOffer(
  projectAddress: string,
  amountWei: bigint,
): Promise<TransactionResponse> {
  return (await project(projectAddress)).submitOffer({ value: amountWei });
}

export async function claimDistribution(projectAddress: string): Promise<TransactionResponse> {
  return (await project(projectAddress)).claimDistribution();
}

export async function claimRefund(projectAddress: string): Promise<TransactionResponse> {
  return (await project(projectAddress)).claimRefund();
}

export async function claimCommission(projectAddress: string): Promise<TransactionResponse> {
  return (await project(projectAddress)).claimCommission();
}

export async function executeSale(projectAddress: string): Promise<TransactionResponse> {
  return (await project(projectAddress)).executeSale();
}

// Mantenimiento / casos borde. El contrato valida las precondiciones (estado/rol/deadline);
// la UI solo muestra el control en el contexto plausible.
export async function cancelExpiredFunding(projectAddress: string): Promise<TransactionResponse> {
  return (await project(projectAddress)).cancelExpiredFunding();
}

export async function cancelStalledMilestone(projectAddress: string): Promise<TransactionResponse> {
  return (await project(projectAddress)).cancelStalledMilestone();
}

export async function pokeFundingGates(projectAddress: string): Promise<TransactionResponse> {
  return (await project(projectAddress)).pokeFundingGates();
}

// Abre la eleccion de arbitro tras alcanzarse el FMPA. Se firma en una tx aparte (bloque
// posterior) para que el snapshot incluya a todos los inversores, incluido el que cruzo el FMPA.
export async function openArbiterElection(projectAddress: string): Promise<TransactionResponse> {
  return (await project(projectAddress)).openArbiterElection();
}

// Lee on-chain si la eleccion de arbitro esta pendiente de abrirse (FMPA alcanzado pero la
// propuesta todavia no se creo). No depende del backend espejo.
export async function arbiterElectionNeedsOpening(projectAddress: string): Promise<boolean> {
  const p = projectRead(projectAddress);
  const [statusRaw, fmpaReached, opened] = await Promise.all([
    p.status() as Promise<bigint>,
    p.fmpaReached() as Promise<boolean>,
    p.arbiterElectionOpened() as Promise<boolean>,
  ]);
  return PROJECT_STATUS[Number(statusRaw)] === "Building" && fmpaReached && !opened;
}

// --- Governor ---

export async function castVote(
  governorAddress: string,
  proposalId: number,
  support: boolean,
): Promise<TransactionResponse> {
  return (await governor(governorAddress)).castVote(proposalId, support);
}

export async function castElectionVote(
  governorAddress: string,
  proposalId: number,
  candidate: string,
): Promise<TransactionResponse> {
  return (await governor(governorAddress)).castElectionVote(proposalId, candidate);
}

export async function castDeveloperSaleVote(
  governorAddress: string,
  proposalId: number,
  support: boolean,
): Promise<TransactionResponse> {
  return (await governor(governorAddress)).castDeveloperSaleVote(proposalId, support);
}

// Cierra una propuesta vencida que no se auto-resolvio (no voto el 100% del poder). Cualquiera
// puede llamarla una vez pasado el deadline.
export async function resolve(
  governorAddress: string,
  proposalId: number,
): Promise<TransactionResponse> {
  return (await governor(governorAddress)).resolve(proposalId);
}

// Desempate del arbitro cuando la propuesta quedo AwaitingArbiter. Solo el arbitro electo.
export async function arbiterDecide(
  governorAddress: string,
  proposalId: number,
  approve: boolean,
): Promise<TransactionResponse> {
  return (await governor(governorAddress)).arbiterDecide(proposalId, approve);
}

// --- Token (FDT) ---

// La auto-delegacion ocurre on-chain en FenrirToken._update (al recibir FDT), asi que no se
// expone un paso manual de delegacion en el front.
export async function transferFdt(
  tokenAddress: string,
  to: string,
  amountWei: bigint,
): Promise<TransactionResponse> {
  return (await token(tokenAddress)).transfer(to, amountWei);
}
