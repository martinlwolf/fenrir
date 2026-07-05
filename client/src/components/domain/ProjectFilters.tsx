import { SlidersHorizontal, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PROJECT_STATUS, PROJECT_TYPE } from "@shared/constants/enums";
import type { ProjectStatusValue, ProjectTypeValue } from "@shared/constants/enums";

const ALL = "__all__";

const TYPE_LABEL: Record<ProjectTypeValue, string> = {
  Investment: "Inversión",
  Civic: "Cívico",
};
const STATUS_LABEL: Record<ProjectStatusValue, string> = {
  Funding: "En fondeo",
  Building: "En construcción",
  Selling: "En venta",
  Completed: "Completado",
  Cancelled: "Cancelado",
};

export interface ProjectFiltersValue {
  type?: ProjectTypeValue;
  status?: ProjectStatusValue;
}

// Barra de filtros con look de buscador inmobiliario: misma funcionalidad (tipo + estado), solo
// reestilizada en una superficie tipo "panel de busqueda".
export function ProjectFilters({
  value,
  onChange,
}: {
  value: ProjectFiltersValue;
  onChange: (value: ProjectFiltersValue) => void;
}) {
  const active = !!(value.type || value.status);

  return (
    <div className="animate-fade-up flex flex-wrap items-center gap-3 rounded-xl border border-[var(--fen-border)] bg-card p-3 shadow-sm">
      <span className="flex items-center gap-2 pl-1 pr-1 text-sm font-medium text-[var(--fen-ink-2)]">
        <SlidersHorizontal className="size-4 text-[var(--fen-accent)]" />
        Filtrar
      </span>

      <div className="hidden h-6 w-px bg-[var(--fen-divider)] sm:block" />

      <Select
        value={value.type ?? ALL}
        onValueChange={(v) =>
          onChange({ ...value, type: v === ALL ? undefined : (v as ProjectTypeValue) })
        }
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Tipo de proyecto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los tipos</SelectItem>
          {PROJECT_TYPE.map((t) => (
            <SelectItem key={t} value={t}>
              {TYPE_LABEL[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.status ?? ALL}
        onValueChange={(v) =>
          onChange({ ...value, status: v === ALL ? undefined : (v as ProjectStatusValue) })
        }
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los estados</SelectItem>
          {PROJECT_STATUS.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {active && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-[var(--fen-muted)] hover:text-[var(--fen-clay)]"
          onClick={() => onChange({})}
        >
          <X className="size-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
