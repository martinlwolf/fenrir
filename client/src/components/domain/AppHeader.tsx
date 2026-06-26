import { Link } from "react-router-dom";
import { AlertTriangle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/providers/WalletProvider";
import { shortAddress } from "@/lib/format";

export function AppHeader() {
  const { address, hasWallet, isOnSepolia, connecting, connect, switchNetwork } = useWallet();

  return (
    <header className="border-b">
      <div className="container flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="text-lg">🐺 Fenrir</span>
          </Link>
          <nav className="hidden gap-4 text-sm text-muted-foreground sm:flex">
            <Link to="/" className="hover:text-foreground">
              Proyectos
            </Link>
            <Link to="/marketplace" className="hover:text-foreground">
              En venta
            </Link>
            <Link to="/portfolio" className="hover:text-foreground">
              Mi participación
            </Link>
            <Link to="/create" className="hover:text-foreground">
              Crear
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {address && !isOnSepolia && (
            <Button variant="destructive" size="sm" onClick={() => void switchNetwork()}>
              <AlertTriangle /> Cambiar a Sepolia
            </Button>
          )}
          {address ? (
            <Badge variant="outline" className="gap-1 py-1">
              <Wallet className="size-3" /> {shortAddress(address)}
            </Badge>
          ) : hasWallet ? (
            <Button size="sm" onClick={() => void connect()} disabled={connecting}>
              <Wallet /> {connecting ? "Conectando…" : "Conectar wallet"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild>
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
