import { Link } from "react-router-dom";
import { LandingContainer } from "./LandingContainer";
import { FenrirLogo } from "./FenrirLogo";

const COLUMNS = [
  {
    title: "PRODUCTO",
    links: [
      { label: "Proyectos", to: "/projects" },
      { label: "En venta", to: "/marketplace" },
      { label: "Crear proyecto", to: "/create" },
    ],
  },
  {
    title: "COMUNIDAD",
    links: [
      { label: "Desarrolladores", to: "/developers" },
      { label: "Mi participación", to: "/portfolio" },
      { label: "Registrarme", to: "/developers/register" },
    ],
  },
];

// Footer compacto, comun a toda la app.
export function LandingFooter() {
  return (
    <footer
      id="docs"
      className="border-t border-[var(--fen-border)] bg-[var(--fen-surface)]"
    >
      <LandingContainer className="flex flex-col gap-6 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Marca */}
          <div className="flex max-w-xs flex-col gap-2.5">
            <FenrirLogo size={26} wordSize={15} />
            <p className="text-[13px] leading-5 text-[var(--fen-body)]">
              El fideicomiso descentralizado. Smart contracts y un DAO en lugar del fiduciario
              humano.
            </p>
            <span className="inline-flex w-fit items-center gap-2 rounded-md border border-[var(--fen-border)] bg-white px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-[var(--fen-verified)]" />
              <span className="font-mono text-[11px] text-[var(--fen-body)]">
                0x7af3…e2Bc · Sepolia
              </span>
            </span>
          </div>

          {/* Links */}
          <div className="flex gap-12 sm:gap-16">
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-2">
                <span className="text-[11px] font-bold tracking-[1px] text-[var(--fen-muted)]">
                  {col.title}
                </span>
                {col.links.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    className="text-[13px] text-[var(--fen-ink-2)] transition-colors hover:text-[var(--fen-accent-strong)]"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="h-px w-full bg-[var(--fen-rule)]" />

        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <span className="text-[12px] text-[var(--fen-muted)]">
            © 2026 Fenrir · Proyecto académico de introducción a blockchain · No maneja dinero real
          </span>
          <span className="font-mono text-[12px] text-[var(--fen-muted)]">Built on Ethereum</span>
        </div>
      </LandingContainer>
    </footer>
  );
}
