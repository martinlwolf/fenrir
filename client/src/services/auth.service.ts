// Auth por firma de wallet (SIWE-like). Unica via a /auth/* del backend.
import { api } from "@/lib/api";
import {
  nonceResponseSchema,
  verifyResponseSchema,
  type NonceResponse,
  type VerifyResponse,
} from "@shared/schemas/auth.schema";

export async function requestNonce(wallet: string): Promise<NonceResponse> {
  const { data } = await api.post("/auth/nonce", { wallet });
  return nonceResponseSchema.parse(data);
}

export async function verifySignature(
  wallet: string,
  signature: string,
): Promise<VerifyResponse> {
  const { data } = await api.post("/auth/verify", { wallet, signature });
  return verifyResponseSchema.parse(data);
}
