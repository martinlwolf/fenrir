import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { AlertTriangle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FenrirLogo } from "@/components/landing/FenrirLogo";
import { useWallet } from "@/providers/WalletProvider";
import { AddressTag } from "@/components/domain/AddressTag";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/projects", label: "Proyectos", end: false },
  { to: "/marketplace", label: "En venta", end: false },
  { to: "/developers", label: "Desarrolladores", end: false },
  { to: "/portfolio", label: "Mi participación", end: false },
];

// `overlay`: el header flota transparente sobre el hero del home y se vuelve solido al scrollear.
export function AppHeader({ overlay = false }: { overlay?: boolean }) {
  const { address, hasWallet, isOnSepolia, connecting, connect, switchNetwork } = useWallet();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  // solid = fondo claro con texto oscuro. !solid = transparente sobre hero, texto blanco.
  const solid = !overlay || scrolled;

  return (
    <header
      className={cn(
        "top-0 z-40 transition-colors duration-300",
        overlay ? "fixed inset-x-0" : "sticky",
        solid
          ? "border-b border-[var(--fen-border)] bg-[var(--fen-bg)]/85 backdrop-blur-md"
          : "border-b border-white/10 bg-transparent",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-7">
          <Link to="/" className="transition-opacity hover:opacity-80">
            <FenrirLogo size={30} wordSize={17} onDark={!solid} />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    solid
                      ? isActive
                        ? "bg-[var(--fen-accent-soft)] text-[var(--fen-accent-strong)]"
                        : "text-[var(--fen-body)] hover:bg-[var(--fen-surface)] hover:text-[var(--fen-ink)]"
                      : isActive
                        ? "bg-white/15 text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="brand" size="sm" className="hidden sm:inline-flex" asChild>
            <Link to="/create">Crear proyecto</Link>
          </Button>

          {address && !isOnSepolia && (
            <Button variant="destructive" size="sm" onClick={() => void switchNetwork()}>
              <AlertTriangle /> Cambiar a Sepolia
            </Button>
          )}
          {address ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs font-medium",
                solid
                  ? "border-[var(--fen-border-strong)] bg-card text-[var(--fen-ink-2)]"
                  : "border-white/20 bg-white/10 text-white backdrop-blur-sm",
              )}
            >
              <span className="size-1.5 rounded-full bg-[var(--fen-accent)]" />
              <Wallet className="size-3.5" />
              <AddressTag address={address} />
            </span>
          ) : hasWallet ? (
            <Button
              variant={solid ? "default" : "outline"}
              size="sm"
              className={cn(!solid && "border-white/30 bg-white/10 text-white hover:bg-white/20")}
              onClick={() => void connect()}
              disabled={connecting}
            >
              <Wallet /> {connecting ? "Conectando…" : "Conectar wallet"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className={cn(!solid && "border-white/30 bg-white/10 text-white hover:bg-white/20")}
              asChild
            >
              <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
                Instalar MetaMask
              </a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
