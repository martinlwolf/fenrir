// Funciones puras de derivacion y capabilities a nivel proyecto. Centralizan la logica que
// antes vivia en el frontend (client/src/components/domain/ProjectCard.tsx y
// ClaimCommissionPanel.tsx): fondeo derivado y permisos del viewer. NO consultan repos ni
// deciden nada on-chain; reciben el estado ya cargado y derivan sobre el espejo (FR-020).
import type { ProjectStatusValue } from "@shared/constants/enums";
import type { Capability } from "@shared/schemas/common.schema";
import { saleCapabilities } from "./SalePolicy";
import type { ViewerContext } from "./Viewer";

// 10000 bps = 100%. Los montos son bigint (wei) para no perder precision al derivar.
const MAX_BPS = 10000n;

// Porcentaje recaudado sobre el objetivo (FF) en basis points, clamp a 10000. Tolera ff=0
// (evita division por cero): sin objetivo, 0%.
export function fundedBps(totalRaised: bigint, ff: bigint): number {
  if (ff === 0n) return 0;
  const bps = (totalRaised * MAX_BPS) / ff;
  return Number(bps < MAX_BPS ? bps : MAX_BPS);
}

// Estado minimo del proyecto que necesita fundingOpen. Se tipa local para no acoplar la
// policy al model ni a persistence.
export interface FundingProjectInput {
  status: ProjectStatusValue;
  totalRaised: bigint;
  ff: bigint;
  fundingDeadline: Date;
}

// La ronda sigue abierta entre el FMPA y el FF: alcanzar el FMPA pasa el proyecto a Building
// pero NO cierra la ronda (business_rules/fondeo-y-comision.md). En Funding corre el TTL de
// fondeo; ya en Building se invierte hasta llegar al FF (totalRaised >= ff).
export function fundingOpen(project: FundingProjectInput): boolean {
  const now = new Date();
  return (
    project.totalRaised < project.ff &&
    (project.status === "Building" ||
      (project.status === "Funding" && project.fundingDeadline > now))
  );
}

// Estado que combinan las capabilities de proyecto. `open` se calcula una vez y se inyecta
// para no recomputar fundingOpen.
export interface ProjectCapabilityInput {
  status: ProjectStatusValue;
  fundingOpen: boolean;
}

export interface ProjectCapabilities {
  invest: Capability;
  claimCommission: Capability;
  canExecuteSale: Capability;
}

// Contexto de venta opcional: solo se pasa en getDetail (donde cargamos las ofertas).
// En list/listBuyerView se omite para no incurrir en N queries extra; canExecuteSale
// cae al fallback "datos no disponibles".
export interface SaleContext {
  hasApprovedOffer: boolean;
}

// Permisos del viewer para invertir, reclamar la comision y ejecutar la venta. El backend
// decide; el frontend solo habilita/deshabilita la UI. Espeja la logica de
// ProjectCard/ClaimCommissionPanel y SaleSection.tsx:38-41.
export function projectCapabilities(
  project: ProjectCapabilityInput,
  viewer: ViewerContext,
  saleContext?: SaleContext,
): ProjectCapabilities {
  // canExecuteSale: si no hay contexto de venta (lista), respuesta conservadora sin query.
  const canExecuteSale: Capability =
    saleContext !== undefined
      ? saleCapabilities(project.status, saleContext.hasApprovedOffer).canExecuteSale
      : { allowed: false, reason: "Datos de venta no disponibles" };

  return {
    invest: investCapability(project, viewer),
    claimCommission: claimCommissionCapability(project, viewer),
    canExecuteSale,
  };
}

function investCapability(
  project: ProjectCapabilityInput,
  viewer: ViewerContext,
): Capability {
  if (viewer.wallet == null) {
    return { allowed: false, reason: "Conectá tu wallet para invertir" };
  }
  if (viewer.isDeveloper) {
    return {
      allowed: false,
      reason: "El desarrollador no puede invertir en su propio proyecto",
    };
  }
  if (!project.fundingOpen) {
    return { allowed: false, reason: "La ronda de inversión está cerrada" };
  }
  return { allowed: true };
}

function claimCommissionCapability(
  project: ProjectCapabilityInput,
  viewer: ViewerContext,
): Capability {
  if (!viewer.isDeveloper) {
    return { allowed: false, reason: "Solo el desarrollador puede reclamar la comisión" };
  }
  if (project.status !== "Completed") {
    return { allowed: false, reason: "El proyecto todavía no se completó" };
  }
  return { allowed: true };
}
