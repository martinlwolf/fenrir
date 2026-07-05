// Encabezado de pagina reutilizable: titulo editorial (serif) + bajada + slot a la derecha
// (filtros, acciones). Le da a todas las vistas de la app el mismo aire de portal inmobiliario.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  /** Etiqueta superior pequena en mayusculas (ej. "Catálogo"). */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Acciones / filtros alineados a la derecha en desktop. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        {eyebrow && (
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fen-accent-strong)]">
            <span className="h-px w-6 bg-[var(--fen-accent)]" />
            {eyebrow}
          </span>
        )}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-[var(--fen-ink)]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm text-[var(--fen-body)]">{description}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
