import { Link } from "react-router-dom";
import { LandingContainer } from "./LandingContainer";
import { EscrowCard } from "./EscrowCard";

const FEATURES = ["Sin intermediarios", "Votación on-chain", "Fondos en custodia"];

export function Hero() {
  return (
    <section className="bg-[var(--fen-bg)] pb-20 pt-16 lg:pb-24 lg:pt-[84px]">
      <LandingContainer>
        <div className="grid items-center gap-12 lg:grid-cols-[696fr_840fr] lg:gap-16">
          {/* Copy */}
          <div className="flex flex-col gap-7">
            <span className="inline-flex w-fit items-center gap-2.5 rounded-full border border-[var(--fen-border)] bg-[var(--fen-surface)] px-[14px] py-2">
              <span className="size-1.5 rounded-full bg-[var(--fen-accent)]" />
              <span className="text-[13px] font-medium text-[var(--fen-body)]">
                Fideicomiso descentralizado · on-chain
              </span>
            </span>

            <h1 className="text-[44px] font-bold leading-[1.06] tracking-tight text-[var(--fen-ink)] sm:text-[56px] lg:text-[72px] lg:leading-[76px]">
              El fiduciario ahora es código.
            </h1>

            <p className="max-w-[600px] text-[19px] leading-[30px] text-[var(--fen-body)]">
              Fenrir reemplaza al fiduciario humano por smart contracts y un DAO. Los
              inversores votan, de forma pública y verificable, si cada etapa del proyecto
              se cumplió — y recién ahí se liberan los fondos.
            </p>

            <div className="flex flex-col gap-3.5 pt-1 sm:flex-row sm:items-center">
              <Link
                to="/projects"
                className="inline-flex items-center justify-center rounded-[10px] bg-[var(--fen-ink)] px-7 py-4 text-base font-bold text-white transition-colors hover:bg-[var(--fen-ink)]/90"
              >
                Explorar proyectos
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center rounded-[10px] border border-[var(--fen-border-strong)] bg-white px-7 py-4 text-base font-bold text-[var(--fen-ink)] transition-colors hover:bg-[var(--fen-surface)]"
              >
                Cómo funciona
              </a>
            </div>

            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-[var(--fen-verified)]">✓</span>
                  <span className="text-[var(--fen-body)]">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tarjeta de votación */}
          <EscrowCard />
        </div>
      </LandingContainer>
    </section>
  );
}
