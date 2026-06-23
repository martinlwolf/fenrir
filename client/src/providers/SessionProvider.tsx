// Sesion de firma para las escrituras off-chain (subir reporte / verificacion). Flujo:
// /auth/nonce -> signMessage -> /auth/verify. La credencial se mantiene en memoria (no
// localStorage) y se adjunta como Authorization: Wallet <sig> via el interceptor de Axios.
import * as React from "react";
import { setWalletAuth } from "@/lib/api";
import { signMessage } from "@/lib/chain/provider";
import { requestNonce, verifySignature } from "@/services/auth.service";
import { useWallet } from "./WalletProvider";

interface SessionState {
  /** wallet con sesion de firma activa, o null. */
  authedWallet: string | null;
  authenticating: boolean;
  /** Garantiza una sesion para la wallet conectada; firma si hace falta. */
  ensureAuth: () => Promise<void>;
}

const SessionContext = React.createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { address } = useWallet();
  const [authedWallet, setAuthedWallet] = React.useState<string | null>(null);
  const [authenticating, setAuthenticating] = React.useState(false);

  // Si cambia la cuenta, se invalida la sesion previa (FR-025).
  React.useEffect(() => {
    if (authedWallet && address !== authedWallet) {
      setAuthedWallet(null);
      setWalletAuth(null);
    }
  }, [address, authedWallet]);

  const ensureAuth = React.useCallback(async () => {
    if (!address) throw new Error("Conecta tu wallet para continuar.");
    if (authedWallet === address) return;
    setAuthenticating(true);
    try {
      const { message } = await requestNonce(address);
      const signature = await signMessage(message);
      const result = await verifySignature(address, signature);
      if (!result.valid) throw new Error("La firma no pudo verificarse.");
      setWalletAuth(`Wallet ${signature}`);
      setAuthedWallet(address);
    } finally {
      setAuthenticating(false);
    }
  }, [address, authedWallet]);

  return (
    <SessionContext.Provider value={{ authedWallet, authenticating, ensureAuth }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
