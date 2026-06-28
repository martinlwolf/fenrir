import { Link } from "react-router-dom";
import { LandingContainer } from "./LandingContainer";
import { FenrirLogo } from "./FenrirLogo";

const COLUMNS = [
  {
    title: "PRODUCTO",
    links: ["Proyectos", "Crear fideicomiso", "Cómo funciona"],
  },
  {
    title: "DAO",
    links: ["Gobernanza", "Votaciones", "Tokens FDT"],
  },
];

export function LandingFooter() {
  return (
    <footer id="docs" className="border-t border-[var(--fen-border)] bg-[var(--fen-surface)] pb-10 pt-16">
      <LandingContainer className="flex flex-col gap-10">
        <div className="flex flex-col justify-between gap-12 lg:flex-row">
          {/* Marca */}
          <div className="flex max-w-[360px] flex-col gap-4">
            <FenrirLogo size={34} wordSize={18} />
            <p className="text-[15px] leading-[23px] text-[var(--fen-body)]">
              El fideicomiso descentralizado. Smart contracts y un DAO en lugar del
              fiduciario humano.
            </p>
            <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-[var(--fen-border)] bg-white px-3 py-2">
              <span className="size-[7px] rounded-full bg-[var(--fen-verified)]" />
              <span className="font-mono text-xs text-[var(--fen-body)]">
                0x7af3…e2Bc · Sepolia
              </span>
            </span>
          </div>

          {/* Links */}
          <div className="flex gap-16 sm:gap-[72px]">
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-[13px]">
                <span className="text-[13px] font-bold tracking-[1px] text-[#a0a4ae]">
                  {col.title}
                </span>
                {col.links.map((l) => (
                  <Link
                    key={l}
                    to="/"
                    className="text-[15px] text-[var(--fen-ink-2)] transition-colors hover:text-[var(--fen-ink)]"
                  >
                    {l}
                  </Link>
                ))}
              </div>
            ))}
          </div>

          {/* Newsletter */}
          <div className="flex max-w-[400px] flex-col gap-3.5">
            <span className="text-base font-bold text-[var(--fen-ink)]">
              Enterate de nuevos proyectos
            </span>
            <p className="text-sm leading-[21px] text-[var(--fen-body)]">
              Novedades del protocolo y proyectos abiertos, sin spam.
            </p>
            <form
              className="flex items-center gap-2.5"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="tu@email.com"
                className="h-[46px] flex-1 rounded-[9px] border border-[var(--fen-border-strong)] bg-white px-3.5 text-sm text-[var(--fen-ink)] placeholder:text-[var(--fen-muted)] focus:border-[var(--fen-accent)] focus:outline-none"
              />
              <button
                type="submit"
                className="h-[46px] shrink-0 rounded-[9px] bg-[var(--fen-ink)] px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--fen-ink)]/90"
              >
                Suscribirme
              </button>
            </form>
          </div>
        </div>

        <div className="h-px w-full bg-[var(--fen-rule)]" />

        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <span className="text-[13px] text-[var(--fen-muted)]">
            © 2026 Fenrir · Proyecto académico de introducción a blockchain · No maneja
            dinero real
          </span>
          <span className="font-mono text-[13px] text-[var(--fen-muted)]">
            Built on Ethereum
          </span>
        </div>
      </LandingContainer>
    </footer>
  );
}
