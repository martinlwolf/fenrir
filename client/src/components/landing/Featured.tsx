import { Link } from "react-router-dom";
import { LandingContainer } from "./LandingContainer";
import { FeaturedProjectCard } from "./FeaturedProjectCard";
import { FEATURED_PROJECTS } from "./data";

export function Featured() {
  return (
    <section className="bg-[var(--fen-surface)] py-20 lg:py-[104px]">
      <LandingContainer className="flex flex-col gap-11">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold tracking-[2px] text-[var(--fen-muted)]">
              PROYECTOS ABIERTOS
            </span>
            <h2 className="text-[34px] font-bold leading-[1.1] text-[var(--fen-ink)] lg:text-[46px] lg:leading-[52px]">
              Elegí en qué confiar
            </h2>
          </div>
          <Link
            to="/projects"
            className="inline-flex shrink-0 items-center rounded-[10px] border border-[var(--fen-border-strong)] bg-white px-[22px] py-[13px] text-[15px] font-bold text-[var(--fen-ink)] transition-colors hover:bg-[var(--fen-surface-2)]"
          >
            Ver todos →
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURED_PROJECTS.map((p) => (
            <FeaturedProjectCard key={p.address} project={p} />
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}
