// Badges de estado que mapean los enums de shared/ a un color. Solo presentacion: el valor
// viene de la API, el frontend no lo decide.
import { Badge } from "@/components/ui/badge";
import type {
  MilestoneStatusValue,
  OfferStatusValue,
  ProjectStatusValue,
} from "@shared/constants/enums";

type Variant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

const PROJECT_LABEL: Record<ProjectStatusValue, string> = {
  Funding: "En fondeo",
  Building: "En construcción",
  Selling: "En venta",
  Completed: "Completado",
  Cancelled: "Cancelado",
};
const PROJECT_VARIANT: Record<ProjectStatusValue, Variant> = {
  Funding: "warning",
  Building: "default",
  Selling: "success",
  Completed: "secondary",
  Cancelled: "destructive",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatusValue }) {
  return <Badge variant={PROJECT_VARIANT[status]}>{PROJECT_LABEL[status]}</Badge>;
}

const MILESTONE_LABEL: Record<MilestoneStatusValue, string> = {
  Pending: "Pendiente",
  Declared: "Declarado",
  Voting: "En votación",
  Approved: "Aprobado",
  Rejected: "Rechazado",
};
const MILESTONE_VARIANT: Record<MilestoneStatusValue, Variant> = {
  Pending: "outline",
  Declared: "secondary",
  Voting: "warning",
  Approved: "success",
  Rejected: "destructive",
};

export function MilestoneStatusBadge({
  status,
  expired = false,
  pausedForFunds = false,
  retryExpired = false,
}: {
  status: MilestoneStatusValue;
  /** La votacion ya vencio pero todavia no se resolvio on-chain (sigue en estado Voting). */
  expired?: boolean;
  /** Declarado pero la votacion no abrio: faltan fondos para financiar el hito (pausa indefinida). */
  pausedForFunds?: boolean;
  /** Hito rechazado en ventana de reintento (Pending + retryCount>0) cuyo plazo de 2 min ya paso. */
  retryExpired?: boolean;
}) {
  if (status === "Voting" && expired) {
    return <Badge variant="destructive">Votación vencida</Badge>;
  }
  if (status === "Pending" && retryExpired) {
    return <Badge variant="destructive">Reintento vencido</Badge>;
  }
  if (status === "Declared" && pausedForFunds) {
    return <Badge variant="warning">Declarado · sin fondos</Badge>;
  }
  return <Badge variant={MILESTONE_VARIANT[status]}>{MILESTONE_LABEL[status]}</Badge>;
}

const OFFER_LABEL: Record<OfferStatusValue, string> = {
  Voting: "En votación",
  Approved: "Aprobada",
  Rejected: "Rechazada",
  Refunded: "Reembolsada",
  Executed: "Ejecutada",
};
const OFFER_VARIANT: Record<OfferStatusValue, Variant> = {
  Voting: "warning",
  Approved: "success",
  Rejected: "destructive",
  Refunded: "secondary",
  Executed: "default",
};

export function OfferStatusBadge({ status }: { status: OfferStatusValue }) {
  return <Badge variant={OFFER_VARIANT[status]}>{OFFER_LABEL[status]}</Badge>;
}
