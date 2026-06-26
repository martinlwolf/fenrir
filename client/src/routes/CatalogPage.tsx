import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/domain/ProjectCard";
import {
  ProjectFilters,
  type ProjectFiltersValue,
} from "@/components/domain/ProjectFilters";
import { CardsSkeleton, EmptyState, ErrorState } from "@/components/domain/states";

export function CatalogPage() {
  const [filters, setFilters] = useState<ProjectFiltersValue>({});
  const { data, isLoading, isError, refetch } = useProjects(filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Proyectos</h1>
          <p className="text-sm text-muted-foreground">
            Descubrí proyectos de inversión y obra cívica.
          </p>
        </div>
        <ProjectFilters value={filters} onChange={setFilters} />
      </div>

      {isLoading ? (
        <CardsSkeleton />
      ) : isError ? (
        <ErrorState
          description="No se pudieron cargar los proyectos."
          onRetry={() => void refetch()}
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No hay proyectos"
          description="Probá quitar los filtros o volvé más tarde."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((p) => (
            <ProjectCard key={p.address} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
