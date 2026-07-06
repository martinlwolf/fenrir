// UNICA instancia de Axios del frontend (constitution Principio III). Ningun componente
// ni service crea su propia instancia; todos importan `api` de aca.
import axios, { AxiosError } from "axios";
import type { ApiError } from "@shared/types/api";
import { env } from "./env";

export const api = axios.create({
  baseURL: env.apiUrl,
  // El backend resuelve la auth por firma; mantenemos withCredentials por si usa cookie.
  withCredentials: false,
  timeout: 15000,
  // ngrok free intercepta las requests de navegador con una pagina de advertencia HTML
  // (ERR_NGROK_6024) que no trae headers CORS -> el browser lo reporta como "CORS error".
  // Este header le dice a ngrok que deje pasar la request directo al backend.
  headers: { "ngrok-skip-browser-warning": "true" },
});

/** Credencial de sesion por firma de wallet; la setea el SessionProvider tras /auth/verify. */
let walletAuth: { address: string; signature: string } | null = null;

export function setWalletAuth(auth: { address: string; signature: string } | null): void {
  walletAuth = auth;
}

/**
 * Direccion de la wallet conectada pero SIN firmar (hint de UI). La setea el WalletProvider
 * apenas hay wallet conectada. Sirve para que el backend resuelva el `viewer` (que boton/label
 * mostrar) sin exigir firma; NO es seguridad: la real es on-chain al firmar la tx.
 */
let viewerAddress: string | null = null;

export function setViewerAddress(addr: string | null): void {
  viewerAddress = addr;
}

api.interceptors.request.use((config) => {
  if (walletAuth) {
    // Sesion firmada: mandamos direccion + firma (auth real para endpoints protegidos).
    config.headers.set("x-wallet-address", walletAuth.address);
    config.headers.set("x-wallet-signature", walletAuth.signature);
  } else if (viewerAddress) {
    // Solo wallet conectada (sin firma): mandamos SOLO la direccion como hint de UI para que
    // el backend puebla el `viewer`. Sin signature -> los endpoints protegidos siguen exigiendo
    // firma (correcto); la seguridad real es on-chain.
    config.headers.set("x-wallet-address", viewerAddress);
  }
  return config;
});

/** Error normalizado que consumen los estados de error de la UI. */
export class FrontendApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: unknown;
  constructor(message: string, code: string, status?: number, details?: unknown) {
    super(message);
    this.name = "FrontendApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const data = error.response?.data;
    throw new FrontendApiError(
      data?.error ?? error.message ?? "Error de red",
      data?.error_code ?? "NETWORK_ERROR",
      error.response?.status,
      data?.details,
    );
  },
);
