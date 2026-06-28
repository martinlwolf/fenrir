// Pill de estado de la landing: misma lógica de labels/variantes que
// components/domain/StatusBadge.tsx, pero con el estilo "soft" del diseño (Fenrir · Home).
// El estado lo decide la API; acá solo es presentación de los datos mockeados.
import { cn } from "@/lib/utils";
import type { ProjectStatusValue } from "@shared/constants/enums";

const PROJECT_LABEL: Record<ProjectStatusValue, string> = {
  Funding: "En fondeo",
  Building: "En construcción",
  Selling: "En venta",
  Completed: "Completado",
  Cancelled: "Cancelado",
};

// Réplica del mapa de variantes (warning / default / success / secondary / destructive)
// expresado como las pastillas suaves que pide el diseño.
const PROJECT_PILL: Record<ProjectStatusValue, string> = {
  Funding: "bg-[var(--fen-amber-soft)] text-[var(--fen-amber)]",
  Building: "bg-[var(--fen-ink)] text-white",
  Selling: "bg-[var(--fen-verified-soft)] text-[var(--fen-verified)]",
  Completed: "bg-[var(--fen-surface-2)] text-[var(--fen-body)]",
  Cancelled: "bg-red-50 text-red-600",
};

export function LandingStatusPill({
  status,
  className,
}: {
  status: ProjectStatusValue;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-[11px] py-[5px] text-xs font-bold",
        PROJECT_PILL[status],
        className,
      )}
    >
      {PROJECT_LABEL[status]}
    </span>
  );
}
