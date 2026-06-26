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

export function ProjectFilters({
  value,
  onChange,
}: {
  value: ProjectFiltersValue;
  onChange: (value: ProjectFiltersValue) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={value.type ?? ALL}
        onValueChange={(v) =>
          onChange({ ...value, type: v === ALL ? undefined : (v as ProjectTypeValue) })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Tipo" />
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
        <SelectTrigger className="w-44">
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

      {(value.type || value.status) && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          Limpiar
        </Button>
      )}
    </div>
  );
}
