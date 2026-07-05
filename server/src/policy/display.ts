// Unica fuente de labels + variantes semanticas de estado del backend. Reemplaza los mapas
// que hoy viven hardcodeados en client/src/components/domain/StatusBadge.tsx: el backend
// decide texto y variante, el frontend solo mapea variant -> color/icono. Aca NO van iconos
// (quedan en el front). Deriva del estado del espejo, no lo modifica (FR-020).
import type {
  MilestoneStatusValue,
  OfferStatusValue,
  ProjectStatusValue,
} from "@shared/constants/enums";
import type { Display } from "@shared/schemas/common.schema";

const PROJECT_DISPLAY: Record<ProjectStatusValue, Display> = {
  Funding: { label: "En fondeo", variant: "warning" },
  Building: { label: "En construcción", variant: "info" },
  Selling: { label: "En venta", variant: "brand" },
  Completed: { label: "Completado", variant: "success" },
  Cancelled: { label: "Cancelado", variant: "destructive" },
};

export function projectDisplay(status: ProjectStatusValue): Display {
  return PROJECT_DISPLAY[status];
}

const OFFER_DISPLAY: Record<OfferStatusValue, Display> = {
  Voting: { label: "En votación", variant: "warning" },
  Approved: { label: "Aprobada", variant: "success" },
  Rejected: { label: "Rechazada", variant: "destructive" },
  Refunded: { label: "Reembolsada", variant: "secondary" },
  Executed: { label: "Ejecutada", variant: "brand" },
};

export function offerDisplay(status: OfferStatusValue): Display {
  return OFFER_DISPLAY[status];
}

const MILESTONE_DISPLAY: Record<MilestoneStatusValue, Display> = {
  Pending: { label: "Pendiente", variant: "outline" },
  Declared: { label: "Declarado", variant: "secondary" },
  Voting: { label: "En votación", variant: "warning" },
  Approved: { label: "Aprobado", variant: "success" },
  Rejected: { label: "Rechazado", variant: "destructive" },
};

export interface ProposalDisplayInput {
  active: boolean;
  expired: boolean;
  awaitingArbiter: boolean;
}

// Labels de estado de propuesta. Replica la logica hardcodeada en VotePanel.tsx:74-81.
export function proposalDisplay(input: ProposalDisplayInput): Display {
  if (input.awaitingArbiter) {
    return { label: "Esperando árbitro", variant: "warning" };
  }
  if (input.active && input.expired) {
    return { label: "Votación vencida", variant: "destructive" };
  }
  if (input.active && !input.expired) {
    return { label: "En votación", variant: "warning" };
  }
  // Resolved (y cualquier otro estado terminal).
  return { label: "Resuelta", variant: "secondary" };
}

export interface MilestoneDisplayInput {
  status: MilestoneStatusValue;
  /** La votacion ya vencio pero todavia no se resolvio on-chain (sigue en Voting). */
  votingExpired?: boolean;
  /** Declarado pero la votacion no abrio: faltan fondos para financiar el hito. */
  pausedForFunds?: boolean;
  /** Hito rechazado en ventana de reintento cuyo plazo ya paso. */
  retryExpired?: boolean;
}

export function milestoneDisplay(input: MilestoneDisplayInput): Display {
  // Casos especiales derivados PRIMERO (espejan StatusBadge): tienen prioridad sobre el
  // mapa base porque el estado on-chain crudo no alcanza para describirlos.
  if (input.status === "Voting" && input.votingExpired) {
    return { label: "Votación vencida", variant: "destructive" };
  }
  if (input.status === "Pending" && input.retryExpired) {
    return { label: "Reintento vencido", variant: "destructive" };
  }
  if (input.status === "Declared" && input.pausedForFunds) {
    return { label: "Declarado · sin fondos", variant: "warning" };
  }
  return MILESTONE_DISPLAY[input.status];
}
