// ProjectCard de la landing (variante "marketing" del catálogo). Reproduce las tarjetas de la
// sección Featured del diseño. Datos mockeados, sin navegación a la app real salvo el contenedor.
import { Link } from "react-router-dom";
import { LandingStatusPill } from "./LandingStatusPill";
import type { FeaturedProject } from "./data";

const TYPE_LABEL: Record<FeaturedProject["type"], string> = {
  Investment: "Inversión",
  Civic: "Cívico",
};

export function FeaturedProjectCard({ project }: { project: FeaturedProject }) {
  const barColor =
    project.progressTone === "verified"
      ? "bg-[var(--fen-verified)]"
      : "bg-[var(--fen-accent)]";

  return (
    <Link
      to="/"
      className="flex flex-col gap-3.5 rounded-[14px] border border-[var(--fen-border)] bg-white p-6 transition-colors hover:border-[var(--fen-border-strong)]"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-[var(--fen-border-strong)] px-[11px] py-[5px] text-xs font-bold text-[var(--fen-ink-2)]">
          {TYPE_LABEL[project.type]}
        </span>
        <LandingStatusPill status={project.status} />
      </div>

      <span className="font-mono text-[17px] font-bold text-[var(--fen-ink)]">
        {project.address}
      </span>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[var(--fen-muted)]">Recaudado</span>
          <span className="font-mono font-bold text-[var(--fen-ink)]">{project.raised}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--fen-divider)]">
          <div
            className={"h-full rounded-full " + barColor}
            style={{ width: `${project.progressPct}%` }}
          />
        </div>
      </div>

      <div className="h-px w-full bg-[var(--fen-divider)]" />

      <div className="flex flex-col gap-[7px]">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[var(--fen-muted)]">Objetivo (FF)</span>
          <span className="font-mono text-[13px] text-[var(--fen-ink-2)]">{project.ff}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[var(--fen-muted)]">Mínimo (FMPA)</span>
          <span className="font-mono text-[13px] text-[var(--fen-ink-2)]">{project.fmpa}</span>
        </div>
      </div>
    </Link>
  );
}
