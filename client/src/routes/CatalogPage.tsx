import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/domain/ProjectCard";
import { PageHeader } from "@/components/domain/PageHeader";
import {
  ProjectFilters,
  type ProjectFiltersValue,
} from "@/components/domain/ProjectFilters";
import { CardsSkeleton, EmptyState, ErrorState } from "@/components/domain/states";

export function CatalogPage() {
  const [filters, setFilters] = useState<ProjectFiltersValue>({});
  const { data, isLoading, isError, refetch } = useProjects(filters);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Catálogo"
        title="Proyectos inmobiliarios"
        description="Descubrí proyectos de inversión y obra cívica fondeados y auditados on-chain por la comunidad."
      >
        {typeof data?.total === "number" && (
          <p className="hidden text-sm text-[var(--fen-muted)] sm:block">
            <span className="font-semibold text-[var(--fen-ink)]">{data.total}</span> proyectos
          </p>
        )}
      </PageHeader>

      <ProjectFilters value={filters} onChange={setFilters} />

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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((p, i) => (
            <div
              key={p.address}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 9) * 60}ms` }}
            >
              <ProjectCard project={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
