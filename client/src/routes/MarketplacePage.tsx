import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/domain/ProjectCard";
import { CardsSkeleton, EmptyState, ErrorState } from "@/components/domain/states";

// Vista comprador: solo proyectos en venta (GET /projects/buyer-view). El frontend pasa la
// vista, el backend impone el filtro (FR-007, SC-006).
export function MarketplacePage() {
  const { data, isLoading, isError, refetch } = useProjects({}, true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">En venta</h1>
        <p className="text-sm text-muted-foreground">
          Proyectos terminados, disponibles para hacer una oferta de compra.
        </p>
      </div>

      {isLoading ? (
        <CardsSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No hay proyectos en venta" />
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
