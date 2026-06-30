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
});

/** Credencial de sesion por firma de wallet; la setea el SessionProvider tras /auth/verify. */
let walletAuth: { address: string; signature: string } | null = null;

export function setWalletAuth(auth: { address: string; signature: string } | null): void {
  walletAuth = auth;
}

api.interceptors.request.use((config) => {
  if (walletAuth) {
    config.headers.set("x-wallet-address", walletAuth.address);
    config.headers.set("x-wallet-signature", walletAuth.signature);
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
