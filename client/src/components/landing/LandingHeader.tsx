import { Link } from "react-router-dom";
import { LandingContainer } from "./LandingContainer";
import { FenrirLogo } from "./FenrirLogo";

const NAV = [
  { label: "Proyectos", to: "/" },
  { label: "Cómo funciona", to: "#como-funciona" },
  { label: "DAO", to: "#dao" },
  { label: "Docs", to: "#docs" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--fen-border)] bg-[var(--fen-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--fen-bg)]/80">
      <LandingContainer className="flex h-[87px] items-center justify-between">
        <div className="flex items-center gap-10">
          <Link to="/landing" aria-label="Fenrir — inicio">
            <FenrirLogo />
          </Link>
          <nav className="hidden items-center gap-8 lg:flex">
            {NAV.map((item, i) => (
              <a
                key={item.label}
                href={item.to}
                className={
                  "text-[15px] transition-colors hover:text-[var(--fen-ink)] " +
                  (i === 0
                    ? "font-medium text-[var(--fen-ink)]"
                    : "text-[var(--fen-body)]")
                }
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-[var(--fen-border)] bg-[var(--fen-surface)] px-[14px] py-[9px] sm:inline-flex">
            <span className="size-[7px] rounded-full bg-[var(--fen-verified)]" />
            <span className="font-mono text-[13px] text-[var(--fen-body)]">Sepolia</span>
          </span>
          <button
            type="button"
            className="rounded-[9px] bg-[var(--fen-ink)] px-[22px] py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--fen-ink)]/90"
          >
            Conectar wallet
          </button>
        </div>
      </LandingContainer>
    </header>
  );
}
