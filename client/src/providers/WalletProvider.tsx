// Estado de la wallet conectada (cuenta + red). Aislado: usa lib/chain/provider, no ethers
// directo. Refleja cambios de cuenta/red sin recargar (FR-025).
import * as React from "react";
import {
  connectWallet,
  getAccounts,
  getChainId,
  hasWallet,
  isOnSepolia,
  switchToSepolia,
} from "@/lib/chain/provider";

interface WalletState {
  address: string | null;
  chainId: number | null;
  hasWallet: boolean;
  isOnSepolia: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
}

const WalletContext = React.createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = React.useState<string | null>(null);
  const [chainId, setChainId] = React.useState<number | null>(null);
  const [connecting, setConnecting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!hasWallet()) return;
    try {
      const [accounts, id] = await Promise.all([getAccounts(), getChainId()]);
      setAddress(accounts[0] ?? null);
      setChainId(id);
    } catch {
      /* lectura best-effort; sin wallet no rompe la app */
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    const eth = window.ethereum;
    if (!eth) return;
    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAddress(accounts[0]?.toLowerCase() ?? null);
    };
    const onChain = (...args: unknown[]) => {
      const hex = args[0] as string;
      setChainId(Number.parseInt(hex, 16));
    };
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener("accountsChanged", onAccounts);
      eth.removeListener("chainChanged", onChain);
    };
  }, [refresh]);

  const connect = React.useCallback(async () => {
    setConnecting(true);
    try {
      const addr = await connectWallet();
      setAddress(addr || null);
      setChainId(await getChainId());
    } finally {
      setConnecting(false);
    }
  }, []);

  const switchNetwork = React.useCallback(async () => {
    await switchToSepolia();
    setChainId(await getChainId());
  }, []);

  const value: WalletState = {
    address,
    chainId,
    hasWallet: hasWallet(),
    isOnSepolia: isOnSepolia(chainId),
    connecting,
    connect,
    switchNetwork,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet debe usarse dentro de <WalletProvider>");
  return ctx;
}
