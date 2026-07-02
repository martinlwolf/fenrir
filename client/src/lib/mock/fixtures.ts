// Datos de ejemplo (seed) para el modo mock (VITE_USE_MOCK). Respetan los schemas de shared/.
// Montos en wei (1 ETH = 1e18). Direcciones 0x + 40 hex en minuscula. El objetivo es poblar
// la UI con un catalogo variado: ambos tipos de proyecto, todos los estados, y un directorio de
// desarrolladores con historial de reputacion (certificados de finalizacion / proyecto fallido).
import type { Display } from "@shared/schemas/common.schema";
import type { ProjectViewer } from "@shared/schemas/project.schema";
import type { MilestoneResponse } from "@shared/schemas/project.schema";
import type { ProjectDetailResponse } from "@shared/schemas/project.schema";
import type { MilestoneStatusValue, ProjectStatusValue } from "@shared/constants/enums";
import type { ReportResponse, ReportVerification } from "@shared/schemas/report.schema";

const ETH = (n: number) => (BigInt(Math.round(n * 1000)) * 10n ** 15n).toString();
const DAY = 86400000;

function addr(seed: string): string {
  return "0x" + seed.repeat(40).slice(0, 40);
}

// --- Directorio de desarrolladores (seed del GET /developers) ---
export interface MockDeveloper {
  wallet: string;
  razonSocial: string;
  cuit: string;
  completed: number;
  failed: number;
  verificationDocsUrl: string | null;
}

export const mockDevelopers: MockDeveloper[] = [
  {
    wallet: addr("d1"),
    razonSocial: "Constructora del Norte S.A.",
    cuit: "30-71234567-8",
    completed: 3,
    failed: 0,
    verificationDocsUrl: "http://localhost:4000/docs/verif-norte.pdf",
  },
  {
    wallet: addr("d2"),
    razonSocial: "Obras Cívicas del Sur S.R.L.",
    cuit: "30-70987654-3",
    completed: 2,
    failed: 1,
    verificationDocsUrl: "http://localhost:4000/docs/verif-sur.pdf",
  },
  {
    wallet: addr("d3"),
    razonSocial: "Fundación Aula Abierta",
    cuit: "30-68800011-2",
    completed: 0,
    failed: 1,
    verificationDocsUrl: null,
  },
  {
    wallet: addr("d4"),
    razonSocial: "Desarrollos Pampa S.A.",
    cuit: "30-71555888-9",
    completed: 1,
    failed: 1,
    verificationDocsUrl: "http://localhost:4000/docs/verif-pampa.pdf",
  },
  {
    wallet: addr("d5"),
    razonSocial: "Municipalidad de Vicente López",
    cuit: "30-99900022-1",
    completed: 4,
    failed: 0,
    verificationDocsUrl: "http://localhost:4000/docs/verif-vlopez.pdf",
  },
  {
    wallet: addr("d6"),
    razonSocial: "Grupo Edilicio Andes",
    cuit: "30-71777333-4",
    completed: 1,
    failed: 0,
    verificationDocsUrl: null,
  },
];

const devName = (wallet: string) =>
  mockDevelopers.find((d) => d.wallet === wallet)?.razonSocial ?? "Desarrollador";

// --- Helpers de los campos derivados que el backend embebe en cada ProjectResponse ---
// En prod los calcula/decide el backend; en el mock los precomputamos estaticos y coherentes
// con el status/montos del fixture (los schemas los exigen y `parse` fallaria sin ellos).

// Porcentaje recaudado sobre el FF, en basis points (0..10000). Tolera ff=0.
function fundedBpsOf(totalRaised: string, ff: string): number {
  try {
    const r = BigInt(totalRaised);
    const goal = BigInt(ff);
    if (goal <= 0n) return 0;
    const bps = Number((r * 10000n) / goal);
    return Math.min(10000, bps);
  } catch {
    return 0;
  }
}

// La ronda sigue abierta mientras el proyecto fondea o construye y no alcanzo el FF.
function fundingOpenOf(status: ProjectStatusValue, totalRaised: string, ff: string): boolean {
  const belowGoal = fundedBpsOf(totalRaised, ff) < 10000;
  return belowGoal && (status === "Funding" || status === "Building");
}

// Label + variante de estado listos para pintar (coherentes con el status del fixture).
const DISPLAY_BY_STATUS: Record<ProjectStatusValue, Display> = {
  Funding: { label: "En fondeo", variant: "warning" },
  Building: { label: "En construcción", variant: "info" },
  Selling: { label: "En venta", variant: "brand" },
  Completed: { label: "Completado", variant: "success" },
  Cancelled: { label: "Cancelado", variant: "destructive" },
};

// Viewer por defecto: anonimo (sin wallet consultante). El mock no resuelve el viewer por
// wallet; estatico alcanza para poblar la UI.
const ANONYMOUS_VIEWER: ProjectViewer = {
  role: "anonymous",
  isDeveloper: false,
  isArbiter: false,
  isInvestor: false,
  capabilities: {
    invest: { allowed: false, reason: "Conectá tu wallet para invertir" },
    claimCommission: {
      allowed: false,
      reason: "Solo el desarrollador puede reclamar la comisión",
    },
    // El backend lo computa dinamicamente; en el mock estatico siempre denegado.
    canExecuteSale: { allowed: false, reason: "Datos de venta no disponibles" },
  },
};

// Label + variante de estado del hito listos para pintar (coherentes con el status del fixture).
// En prod los decide el backend; en el mock los precomputamos estaticos.
const MILESTONE_DISPLAY_BY_STATUS: Record<MilestoneStatusValue, Display> = {
  Pending: { label: "Pendiente", variant: "outline" },
  Declared: { label: "Declarado", variant: "secondary" },
  Voting: { label: "En votación", variant: "warning" },
  Approved: { label: "Aprobado", variant: "success" },
  Rejected: { label: "Rechazado", variant: "destructive" },
};

// Milestone del fixture sin los campos derivados que el backend embebe; los inyectamos abajo para
// no repetir display/pausedForFunds/votingExpired/etc. en cada hito.
type MockMilestoneBase = Omit<
  MilestoneResponse,
  | "display"
  | "pausedForFunds"
  | "votingExpired"
  | "retryExpired"
  | "declarable"
  | "cumulativeBudget"
  | "fundsShortfall"
  | "viewer"
>;

// Cierra el shape de cada milestone con los campos derivados coherentes con su status. El mock no
// resuelve el viewer por wallet: canDeclare siempre denegado (solo el developer real declara).
function fillMilestone(m: MockMilestoneBase, cumulativeBudget: string): MilestoneResponse {
  return {
    ...m,
    display: MILESTONE_DISPLAY_BY_STATUS[m.status],
    pausedForFunds: false,
    votingExpired: false,
    retryExpired: false,
    declarable: false,
    cumulativeBudget,
    fundsShortfall: "0",
    viewer: {
      canDeclare: { allowed: false, reason: "Solo el desarrollador puede declarar hitos" },
    },
  };
}

// Presupuesto acumulado hasta cada hito inclusive (suma de budgets con indice <=).
function fillMilestones(milestones: MockMilestoneBase[]): MilestoneResponse[] {
  return milestones.map((m) => {
    const cumulative = milestones
      .filter((p) => p.milestoneIndex <= m.milestoneIndex)
      .reduce((sum, p) => sum + BigInt(p.budget), 0n)
      .toString();
    return fillMilestone(m, cumulative);
  });
}

// Bloque de mantenimiento derivado (solo en el detalle). El mock lo deja en el caso base "sano":
// ni fondeo vencido ni proyecto estancado.
const MOCK_MAINTENANCE: ProjectDetailResponse["maintenance"] = {
  fundingExpired: false,
  stalled: { active: false, reason: null },
  canCancelStalled: { allowed: false, reason: "El proyecto no está estancado" },
};

// Base de los proyectos sin los campos derivados; abajo los inyectamos con los helpers para no
// repetir fundedBps/fundingOpen/display/viewer/maintenance en cada uno. Los milestones tambien
// van en su forma base (sin campos derivados de hito).
type MockProjectBase = Omit<
  ProjectDetailResponse,
  "fundedBps" | "fundingOpen" | "display" | "viewer" | "maintenance" | "milestones"
> & { milestones: MockMilestoneBase[] };

const mockProjectsBase: MockProjectBase[] = [
  {
    address: addr("a1"),
    tokenAddress: addr("b1"),
    tokenName: "Edificio Roca",
    tokenSymbol: "ROCA",
    developerRazonSocial: devName(addr("d1")),
    investorCount: 12,
    governorAddress: addr("c1"),
    developerWallet: addr("d1"),
    projectType: "Investment",
    votingMode: "ByToken",
    status: "Funding",
    fmpa: ETH(10),
    ff: ETH(40),
    totalRaised: ETH(14),
    totalReleasedToDeveloper: ETH(4),
    estimatedSalePrice: ETH(80),
    salePrice: null,
    fundingDeadline: new Date(Date.now() + 3 * DAY).toISOString(),
    penaltyAccumulatedBps: 0,
    currentArbiter: addr("e1"),
    currentMilestoneIndex: 1,
    milestones: [
      {
        milestoneIndex: 0,
        description:
          "Cimientos y estructura de la planta baja terminados, con certificado de habilitación municipal.",
        budget: ETH(4),
        durationSeconds: "604800",
        deadline: new Date(Date.now() - DAY).toISOString(),
        status: "Approved",
        retryCount: 0,
        trancheReleased: true,
        reportHash: "0x" + "11".repeat(32),
        reportUrl: "http://localhost:4000/reports/1",
        proposalId: 1,
      },
      {
        milestoneIndex: 1,
        description: "Mampostería y losa de los primeros tres pisos completadas.",
        budget: ETH(10),
        durationSeconds: "604800",
        deadline: new Date(Date.now() + DAY).toISOString(),
        status: "Voting",
        retryCount: 0,
        trancheReleased: false,
        reportHash: "0x" + "22".repeat(32),
        reportUrl: "http://localhost:4000/reports/2",
        proposalId: 2,
      },
      {
        milestoneIndex: 2,
        description: "Terminaciones, instalaciones y entrega final del edificio.",
        budget: ETH(26),
        durationSeconds: "1209600",
        deadline: null,
        status: "Pending",
        retryCount: 0,
        trancheReleased: false,
        reportHash: null,
        reportUrl: null,
        proposalId: null,
      },
    ],
  },
  {
    address: addr("a2"),
    tokenAddress: addr("b2"),
    tokenName: "Plaza Belgrano",
    tokenSymbol: "PLBG",
    developerRazonSocial: devName(addr("d2")),
    investorCount: 34,
    governorAddress: addr("c2"),
    developerWallet: addr("d2"),
    projectType: "Civic",
    votingMode: "OneWalletOneVote",
    status: "Building",
    fmpa: ETH(5),
    ff: ETH(20),
    totalRaised: ETH(20),
    totalReleasedToDeveloper: ETH(8),
    estimatedSalePrice: ETH(0),
    salePrice: null,
    fundingDeadline: new Date(Date.now() - 5 * DAY).toISOString(),
    penaltyAccumulatedBps: 150,
    currentArbiter: addr("e2"),
    currentMilestoneIndex: 2,
    milestones: [
      {
        milestoneIndex: 0,
        description: "Movimiento de suelo y solado de la plaza ejecutados.",
        budget: ETH(8),
        durationSeconds: "604800",
        deadline: null,
        status: "Approved",
        retryCount: 0,
        trancheReleased: true,
        reportHash: "0x" + "33".repeat(32),
        reportUrl: "http://localhost:4000/reports/3",
        proposalId: 3,
      },
      {
        milestoneIndex: 1,
        description: "Iluminación, mobiliario urbano y forestación instalados.",
        budget: ETH(12),
        durationSeconds: "1209600",
        deadline: new Date(Date.now() + 2 * DAY).toISOString(),
        status: "Declared",
        retryCount: 1,
        trancheReleased: false,
        reportHash: "0x" + "44".repeat(32),
        reportUrl: "http://localhost:4000/reports/4",
        proposalId: null,
      },
    ],
  },
  {
    address: addr("a3"),
    tokenAddress: addr("b3"),
    tokenName: "Torre Mitre",
    tokenSymbol: "MITRE",
    developerRazonSocial: devName(addr("d1")),
    investorCount: 8,
    governorAddress: addr("c3"),
    developerWallet: addr("d1"),
    projectType: "Investment",
    votingMode: "ByToken",
    status: "Selling",
    fmpa: ETH(15),
    ff: ETH(50),
    totalRaised: ETH(50),
    totalReleasedToDeveloper: ETH(45),
    estimatedSalePrice: ETH(90),
    salePrice: null,
    fundingDeadline: new Date(Date.now() - 30 * DAY).toISOString(),
    penaltyAccumulatedBps: 0,
    currentArbiter: addr("e1"),
    currentMilestoneIndex: 3,
    milestones: [],
  },
  {
    address: addr("a4"),
    tokenAddress: addr("b4"),
    tokenName: "Escuela Sarmiento",
    tokenSymbol: "SARM",
    developerRazonSocial: devName(addr("d3")),
    investorCount: 3,
    governorAddress: addr("c4"),
    developerWallet: addr("d3"),
    projectType: "Civic",
    votingMode: "ByToken",
    status: "Cancelled",
    fmpa: ETH(8),
    ff: ETH(30),
    totalRaised: ETH(6),
    totalReleasedToDeveloper: ETH(0),
    estimatedSalePrice: ETH(0),
    salePrice: null,
    fundingDeadline: new Date(Date.now() - 10 * DAY).toISOString(),
    penaltyAccumulatedBps: 0,
    currentArbiter: null,
    currentMilestoneIndex: 0,
    milestones: [],
  },
  {
    address: addr("a5"),
    tokenAddress: addr("b5"),
    tokenName: "Residencias del Río",
    tokenSymbol: "RIOR",
    developerRazonSocial: devName(addr("d4")),
    investorCount: 21,
    governorAddress: addr("c5"),
    developerWallet: addr("d4"),
    projectType: "Investment",
    votingMode: "ByToken",
    status: "Building",
    fmpa: ETH(20),
    ff: ETH(60),
    totalRaised: ETH(48),
    totalReleasedToDeveloper: ETH(18),
    estimatedSalePrice: ETH(110),
    salePrice: null,
    fundingDeadline: new Date(Date.now() - 2 * DAY).toISOString(),
    penaltyAccumulatedBps: 0,
    currentArbiter: addr("e4"),
    currentMilestoneIndex: 1,
    milestones: [
      {
        milestoneIndex: 0,
        description: "Excavación, fundaciones y submuración del terreno ribereño.",
        budget: ETH(18),
        durationSeconds: "1209600",
        deadline: new Date(Date.now() - 3 * DAY).toISOString(),
        status: "Approved",
        retryCount: 0,
        trancheReleased: true,
        reportHash: "0x" + "55".repeat(32),
        reportUrl: "http://localhost:4000/reports/5",
        proposalId: 5,
      },
      {
        milestoneIndex: 1,
        description: "Estructura de hormigón de las dos torres hasta el piso 8.",
        budget: ETH(24),
        durationSeconds: "1814400",
        deadline: new Date(Date.now() + 4 * DAY).toISOString(),
        status: "Declared",
        retryCount: 0,
        trancheReleased: false,
        reportHash: "0x" + "66".repeat(32),
        reportUrl: "http://localhost:4000/reports/6",
        proposalId: null,
      },
    ],
  },
  {
    address: addr("a6"),
    tokenAddress: addr("b6"),
    tokenName: "Centro de Salud Belgrano",
    tokenSymbol: "CSBE",
    developerRazonSocial: devName(addr("d5")),
    investorCount: 57,
    governorAddress: addr("c6"),
    developerWallet: addr("d5"),
    projectType: "Civic",
    votingMode: "OneWalletOneVote",
    status: "Funding",
    fmpa: ETH(12),
    ff: ETH(45),
    totalRaised: ETH(9),
    totalReleasedToDeveloper: ETH(0),
    estimatedSalePrice: ETH(0),
    salePrice: null,
    fundingDeadline: new Date(Date.now() + 6 * DAY).toISOString(),
    penaltyAccumulatedBps: 0,
    currentArbiter: null,
    currentMilestoneIndex: 0,
    milestones: [],
  },
  {
    address: addr("a7"),
    tokenAddress: addr("b7"),
    tokenName: "Torre Libertador",
    tokenSymbol: "LIBT",
    developerRazonSocial: devName(addr("d1")),
    investorCount: 40,
    governorAddress: addr("c7"),
    developerWallet: addr("d1"),
    projectType: "Investment",
    votingMode: "ByToken",
    status: "Completed",
    fmpa: ETH(25),
    ff: ETH(75),
    totalRaised: ETH(75),
    totalReleasedToDeveloper: ETH(72),
    estimatedSalePrice: ETH(140),
    salePrice: ETH(152),
    fundingDeadline: new Date(Date.now() - 90 * DAY).toISOString(),
    penaltyAccumulatedBps: 0,
    currentArbiter: addr("e1"),
    currentMilestoneIndex: 4,
    milestones: [],
  },
  {
    address: addr("a8"),
    tokenAddress: addr("b8"),
    tokenName: "Parque Lineal Sur",
    tokenSymbol: "PLSU",
    developerRazonSocial: devName(addr("d2")),
    investorCount: 73,
    governorAddress: addr("c8"),
    developerWallet: addr("d2"),
    projectType: "Civic",
    votingMode: "OneWalletOneVote",
    status: "Completed",
    fmpa: ETH(10),
    ff: ETH(35),
    totalRaised: ETH(35),
    totalReleasedToDeveloper: ETH(35),
    estimatedSalePrice: ETH(0),
    salePrice: null,
    fundingDeadline: new Date(Date.now() - 120 * DAY).toISOString(),
    penaltyAccumulatedBps: 0,
    currentArbiter: addr("e2"),
    currentMilestoneIndex: 3,
    milestones: [],
  },
  {
    address: addr("a9"),
    tokenAddress: addr("b9"),
    tokenName: "Loft Palermo Soho",
    tokenSymbol: "LFPS",
    developerRazonSocial: devName(addr("d4")),
    investorCount: 6,
    governorAddress: addr("c9"),
    developerWallet: addr("d4"),
    projectType: "Investment",
    votingMode: "ByToken",
    status: "Funding",
    fmpa: ETH(6),
    ff: ETH(22),
    totalRaised: ETH(4),
    totalReleasedToDeveloper: ETH(0),
    estimatedSalePrice: ETH(40),
    salePrice: null,
    fundingDeadline: new Date(Date.now() + 9 * DAY).toISOString(),
    penaltyAccumulatedBps: 0,
    currentArbiter: null,
    currentMilestoneIndex: 0,
    milestones: [],
  },
  {
    address: addr("aa"),
    tokenAddress: addr("ba"),
    tokenName: "Polideportivo Municipal",
    tokenSymbol: "POLI",
    developerRazonSocial: devName(addr("d5")),
    investorCount: 88,
    governorAddress: addr("ca"),
    developerWallet: addr("d5"),
    projectType: "Civic",
    votingMode: "OneWalletOneVote",
    status: "Building",
    fmpa: ETH(15),
    ff: ETH(50),
    totalRaised: ETH(50),
    totalReleasedToDeveloper: ETH(20),
    estimatedSalePrice: ETH(0),
    salePrice: null,
    fundingDeadline: new Date(Date.now() - 14 * DAY).toISOString(),
    penaltyAccumulatedBps: 0,
    currentArbiter: addr("e5"),
    currentMilestoneIndex: 2,
    milestones: [],
  },
  {
    address: addr("ab"),
    tokenAddress: addr("bb"),
    tokenName: "Edificio Aurora",
    tokenSymbol: "AURO",
    developerRazonSocial: devName(addr("d6")),
    investorCount: 17,
    governorAddress: addr("cb"),
    developerWallet: addr("d6"),
    projectType: "Investment",
    votingMode: "ByToken",
    status: "Selling",
    fmpa: ETH(18),
    ff: ETH(55),
    totalRaised: ETH(55),
    totalReleasedToDeveloper: ETH(50),
    estimatedSalePrice: ETH(95),
    salePrice: null,
    fundingDeadline: new Date(Date.now() - 45 * DAY).toISOString(),
    penaltyAccumulatedBps: 0,
    currentArbiter: addr("e6"),
    currentMilestoneIndex: 3,
    milestones: [],
  },
  {
    address: addr("ac"),
    tokenAddress: addr("bc"),
    tokenName: "Biblioteca Popular Roca",
    tokenSymbol: "BIBL",
    developerRazonSocial: devName(addr("d5")),
    investorCount: 44,
    governorAddress: addr("cc"),
    developerWallet: addr("d5"),
    projectType: "Civic",
    votingMode: "OneWalletOneVote",
    status: "Selling",
    fmpa: ETH(9),
    ff: ETH(28),
    totalRaised: ETH(28),
    totalReleasedToDeveloper: ETH(26),
    estimatedSalePrice: ETH(0),
    salePrice: null,
    fundingDeadline: new Date(Date.now() - 60 * DAY).toISOString(),
    penaltyAccumulatedBps: 0,
    currentArbiter: addr("e5"),
    currentMilestoneIndex: 3,
    milestones: [],
  },
];

// Inyectamos los campos derivados (fundedBps/fundingOpen/display/viewer) para cerrar el shape que
// exigen los schemas de shared/. viewer estatico anonimo: el mock no lo resuelve por wallet.
export const mockProjects: ProjectDetailResponse[] = mockProjectsBase.map((p) => ({
  ...p,
  milestones: fillMilestones(p.milestones),
  fundedBps: fundedBpsOf(p.totalRaised, p.ff),
  fundingOpen: fundingOpenOf(p.status, p.totalRaised, p.ff),
  display: DISPLAY_BY_STATUS[p.status],
  viewer: ANONYMOUS_VIEWER,
  maintenance: MOCK_MAINTENANCE,
}));

export const mockReports: Record<string, ReportResponse> = {
  "2": {
    id: 2,
    projectAddress: addr("a1"),
    milestoneIndex: 1,
    text: "Avance de obra del hito 1: estructura y cimientos completados.",
    mediaUrls: ["http://localhost:4000/media/r2-foto1.jpg"],
    documentUrls: ["http://localhost:4000/docs/r2-acta.pdf"],
    reportHash: "0x" + "22".repeat(32),
    cid: null,
    manifestUrl: null,
    onChainHash: "0x" + "22".repeat(32),
    hashMatch: true,
  },
};

export const mockVerification: Record<string, ReportVerification> = {
  "2": {
    computedHash: "0x" + "22".repeat(32),
    onChainHash: "0x" + "22".repeat(32),
    hashMatch: true,
  },
};
