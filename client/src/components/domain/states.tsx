// Estados transversales de carga / vacio / error (FR-022). Se usan en todas las pantallas
// para no romper nunca la vista cuando la API tarda o falla.
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

// Skeleton que imita la card de proyecto (foto + cuerpo) usando el shimmer de marca.
export function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-[var(--fen-border)] bg-card"
        >
          <div className="shimmer aspect-[16/10] w-full" />
          <div className="space-y-3 p-4">
            <div className="shimmer h-2.5 w-2/3 rounded-full" />
            <div className="shimmer h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <div className="shimmer h-2 w-20 rounded-full" />
              <div className="shimmer h-2 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title = "Sin resultados",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--fen-border-strong)] bg-[var(--fen-surface)]/50 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--fen-surface-2)] text-[var(--fen-muted)]">
        <Inbox className="size-6" />
      </span>
      <p className="font-semibold text-[var(--fen-ink)]">{title}</p>
      {description && <p className="max-w-sm text-sm text-[var(--fen-body)]">{description}</p>}
    </div>
  );
}

export function ErrorState({
  title = "Algo salió mal",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[color:var(--fen-clay)]/30 bg-[var(--fen-clay-soft)]/40 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--fen-clay-soft)] text-[var(--fen-clay)]">
        <AlertCircle className="size-6" />
      </span>
      <div>
        <p className="font-semibold text-[var(--fen-ink)]">{title}</p>
        {description && <p className="text-sm text-[var(--fen-body)]">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
