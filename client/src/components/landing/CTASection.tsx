import { Link } from "react-router-dom";
import { LandingContainer } from "./LandingContainer";

export function CTASection() {
  return (
    <section className="bg-[var(--fen-bg)] pb-20 pt-5 lg:pb-[110px]">
      <LandingContainer>
        <div className="flex flex-col items-center gap-[22px] rounded-3xl bg-[var(--fen-ink)] px-6 py-16 text-center sm:px-12 lg:p-20">
          <span className="text-sm font-bold tracking-[2px] text-[var(--fen-on-dark-muted)]">
            EMPEZÁ EN MINUTOS · SEPOLIA
          </span>
          <h2 className="text-[34px] font-bold leading-[1.08] text-white sm:text-[42px] lg:text-[48px] lg:leading-[54px]">
            Tu próximo proyecto, sin fiduciario
          </h2>
          <p className="max-w-[720px] text-[18px] leading-[28px] text-[var(--fen-on-dark-dim)]">
            Conectá tu wallet, definí los hitos y dejá que el contrato y la comunidad hagan
            el resto.
          </p>
          <div className="flex flex-col gap-3.5 pt-2 sm:flex-row sm:items-center">
            <Link
              to="/create"
              className="inline-flex items-center justify-center rounded-[10px] bg-white px-[30px] py-4 text-base font-bold text-[var(--fen-ink)] transition-colors hover:bg-white/90"
            >
              Crear proyecto
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center justify-center rounded-[10px] border border-[var(--fen-dark-border)] bg-[var(--fen-dark-surface)] px-[30px] py-4 text-base font-bold text-white transition-colors hover:brightness-110"
            >
              Explorar proyectos
            </Link>
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}
