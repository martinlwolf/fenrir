import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/domain/ProjectCard";
import { PageHeader } from "@/components/domain/PageHeader";
import { CardsSkeleton, EmptyState, ErrorState } from "@/components/domain/states";

// Vista comprador: solo proyectos en venta (GET /projects/buyer-view). El frontend pasa la
// vista, el backend impone el filtro (FR-007, SC-006).
export function MarketplacePage() {
  const { data, isLoading, isError, refetch } = useProjects({}, true);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Mercado secundario"
        title="Propiedades en venta"
        description="Proyectos terminados y certificados, disponibles para hacer una oferta de compra on-chain."
      />

      {isLoading ? (
        <CardsSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No hay proyectos en venta"
          description="Cuando un proyecto se complete y salga al mercado, aparecerá acá."
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
