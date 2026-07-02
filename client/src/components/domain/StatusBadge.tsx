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
import type { Display } from "@shared/schemas/common.schema";

type Variant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "brand"
  | "info";

// El label y la variante los decide el backend (viajan en `display`); el icono es puro design
// system y se queda en el front, mapeado por status.
const PROJECT_ICON: Record<ProjectStatusValue, LucideIcon> = {
  Funding: Coins,
  Building: HardHat,
  Selling: Tag,
  Completed: CheckCircle2,
  Cancelled: Ban,
};

export function ProjectStatusBadge({
  status,
  display,
  className,
}: {
  status: ProjectStatusValue;
  display: Display;
  className?: string;
}) {
  const Icon = PROJECT_ICON[status];
  return (
    <Badge variant={display.variant} className={className}>
      <Icon />
      {display.label}
    </Badge>
  );
}

// El icono es puro design system y se queda en el front, mapeado por status. Las flags
// derivadas (votingExpired/retryExpired/pausedForFunds) solo eligen un icono especial; el label
// y la variante SIEMPRE vienen del backend en `display`.
const MILESTONE_ICON: Record<MilestoneStatusValue, LucideIcon> = {
  Pending: Clock,
  Declared: Hourglass,
  Voting: Vote,
  Approved: ThumbsUp,
  Rejected: ThumbsDown,
};

export function MilestoneStatusBadge({
  status,
  display,
  votingExpired = false,
  pausedForFunds = false,
  retryExpired = false,
}: {
  status: MilestoneStatusValue;
  /** Label + variante listos para pintar (los decide el backend, el front no los calcula). */
  display: Display;
  /** La votacion ya vencio pero todavia no se resolvio on-chain (sigue en estado Voting). */
  votingExpired?: boolean;
  /** Declarado pero la votacion no abrio: faltan fondos para financiar el hito (pausa indefinida). */
  pausedForFunds?: boolean;
  /** Hito rechazado en ventana de reintento (Pending + retryCount>0) cuyo plazo de 2 min ya paso. */
  retryExpired?: boolean;
}) {
  // Icono especial por caso derivado; si no aplica, el icono base del status.
  const Icon = votingExpired
    ? Clock
    : retryExpired
      ? RotateCcw
      : pausedForFunds
        ? PauseCircle
        : MILESTONE_ICON[status];
  return (
    <Badge variant={display.variant}>
      <Icon />
      {display.label}
    </Badge>
  );
}

// Icono puro de design system, mapeado por status. El label y variante vienen del backend en
// `display`; el front nunca los calcula.
const OFFER_ICON: Record<OfferStatusValue, LucideIcon> = {
  Voting: Vote,
  Approved: ThumbsUp,
  Rejected: ThumbsDown,
  Refunded: RotateCcw,
  Executed: CheckCircle2,
};

export function OfferStatusBadge({
  status,
  display,
}: {
  status: OfferStatusValue;
  display: Display;
}) {
  const Icon = OFFER_ICON[status];
  return (
    <Badge variant={display.variant}>
      <Icon />
      {display.label}
    </Badge>
  );
}
