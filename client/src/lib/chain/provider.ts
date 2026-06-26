// Capa ethers v6 aislada (constitution Principio II/III): los componentes NO importan
// ethers; usan los hooks/services que llaman a estas funciones. Provider/signer salen de
// window.ethereum.
import { BrowserProvider, type Eip1193Provider, type JsonRpcSigner } from "ethers";
import { env } from "../env";

export class WalletNotFoundError extends Error {
  constructor() {
    super("No se detecto una wallet (MetaMask). Instalala o conectala para firmar.");
    this.name = "WalletNotFoundError";
  }
}

export class WrongNetworkError extends Error {
  constructor() {
    super("Red incorrecta. Cambia a Sepolia para firmar la transaccion.");
    this.name = "WrongNetworkError";
  }
}

const SEPOLIA_HEX = "0xaa36a7"; // 11155111

export function hasWallet(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

export function getProvider(): BrowserProvider {
  if (!hasWallet()) throw new WalletNotFoundError();
  return new BrowserProvider(window.ethereum as unknown as Eip1193Provider);
}

/** Pide conexion (eth_requestAccounts) y devuelve la direccion en minuscula. */
export async function connectWallet(): Promise<string> {
  const provider = getProvider();
  const accounts = (await provider.send("eth_requestAccounts", [])) as string[];
  return accounts[0]?.toLowerCase() ?? "";
}

export async function getAccounts(): Promise<string[]> {
  if (!hasWallet()) return [];
  const provider = getProvider();
  const accounts = (await provider.send("eth_accounts", [])) as string[];
  return accounts.map((a) => a.toLowerCase());
}

export async function getChainId(): Promise<number> {
  const provider = getProvider();
  const network = await provider.getNetwork();
  return Number(network.chainId);
}

export function isOnSepolia(chainId: number | null): boolean {
  return chainId === env.sepoliaChainId;
}

/** Intenta cambiar la wallet a Sepolia; agrega la red si no esta. */
export async function switchToSepolia(): Promise<void> {
  const eth = window.ethereum;
  if (!eth) throw new WalletNotFoundError();
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_HEX }] });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SEPOLIA_HEX,
            chainName: "Sepolia",
            nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

/** Signer del usuario; valida que la red sea Sepolia antes de firmar escrituras. */
export async function getSigner(): Promise<JsonRpcSigner> {
  const provider = getProvider();
  const network = await provider.getNetwork();
  if (!isOnSepolia(Number(network.chainId))) throw new WrongNetworkError();
  return provider.getSigner();
}

/** Firma de un mensaje para la autenticacion SIWE (no cuesta gas). */
export async function signMessage(message: string): Promise<string> {
  const provider = getProvider();
  const signer = await provider.getSigner();
  return signer.signMessage(message);
}
