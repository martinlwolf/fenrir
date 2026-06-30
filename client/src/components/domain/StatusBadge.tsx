// Badges de estado que mapean los enums de shared/ a un color + icono. Solo presentacion: el
// valor viene de la API, el frontend no lo decide.
import {
  Ban,
  CheckCircle2,
  Clock,
  Coins,
  HardHat,
  Hourglass,
  PauseCircle,
  RotateCcw,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  MilestoneStatusValue,
  OfferStatusValue,
  ProjectStatusValue,
} from "@shared/constants/enums";

type Variant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "brand"
  | "info";

const PROJECT_LABEL: Record<ProjectStatusValue, string> = {
  Funding: "En fondeo",
  Building: "En construcción",
  Selling: "En venta",
  Completed: "Completado",
  Cancelled: "Cancelado",
};
const PROJECT_VARIANT: Record<ProjectStatusValue, Variant> = {
  Funding: "warning",
  Building: "info",
  Selling: "brand",
  Completed: "success",
  Cancelled: "destructive",
};
const PROJECT_ICON: Record<ProjectStatusValue, LucideIcon> = {
  Funding: Coins,
  Building: HardHat,
  Selling: Tag,
  Completed: CheckCircle2,
  Cancelled: Ban,
};

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatusValue;
  className?: string;
}) {
  const Icon = PROJECT_ICON[status];
  return (
    <Badge variant={PROJECT_VARIANT[status]} className={className}>
      <Icon />
      {PROJECT_LABEL[status]}
    </Badge>
  );
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
const MILESTONE_ICON: Record<MilestoneStatusValue, LucideIcon> = {
  Pending: Clock,
  Declared: Hourglass,
  Voting: Vote,
  Approved: ThumbsUp,
  Rejected: ThumbsDown,
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
    return (
      <Badge variant="destructive">
        <Clock />
        Votación vencida
      </Badge>
    );
  }
  if (status === "Pending" && retryExpired) {
    return (
      <Badge variant="destructive">
        <RotateCcw />
        Reintento vencido
      </Badge>
    );
  }
  if (status === "Declared" && pausedForFunds) {
    return (
      <Badge variant="warning">
        <PauseCircle />
        Declarado · sin fondos
      </Badge>
    );
  }
  const Icon = MILESTONE_ICON[status];
  return (
    <Badge variant={MILESTONE_VARIANT[status]}>
      <Icon />
      {MILESTONE_LABEL[status]}
    </Badge>
  );
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
  Executed: "brand",
};
const OFFER_ICON: Record<OfferStatusValue, LucideIcon> = {
  Voting: Vote,
  Approved: ThumbsUp,
  Rejected: ThumbsDown,
  Refunded: RotateCcw,
  Executed: CheckCircle2,
};

export function OfferStatusBadge({ status }: { status: OfferStatusValue }) {
  const Icon = OFFER_ICON[status];
  return (
    <Badge variant={OFFER_VARIANT[status]}>
      <Icon />
      {OFFER_LABEL[status]}
    </Badge>
  );
}
