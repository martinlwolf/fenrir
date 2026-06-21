// Servicio de autenticacion por firma de wallet (sin passwords). Flujo: el cliente
// pide un nonce, firma el mensaje con su wallet, y en cada request de escritura envia
// wallet + firma. El backend reconstruye el mensaje desde el nonce vigente y verifica
// la firma con ethers (research.md 4).
import { randomBytes } from "node:crypto";
import { verifyMessage } from "ethers";
import { env } from "../config/env";
import * as authNonceDao from "../daos/authNonce.dao";
import { UnauthorizedException } from "../exceptions/common";

export function buildMessage(wallet: string, nonce: string): string {
  return `Fenrir login\nWallet: ${wallet.toLowerCase()}\nNonce: ${nonce}`;
}

export async function createNonce(wallet: string): Promise<{ nonce: string; message: string }> {
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + env.AUTH_NONCE_TTL_MINUTES * 60_000);
  await authNonceDao.upsertNonce(wallet, nonce, expiresAt);
  return { nonce, message: buildMessage(wallet, nonce) };
}

// Verifica que `signature` corresponda al nonce vigente de `wallet`. Devuelve la
// wallet normalizada si es valida; lanza UnauthorizedException si no.
export async function verifyWalletSignature(wallet: string, signature: string): Promise<string> {
  const stored = await authNonceDao.getNonce(wallet);
  if (!stored) throw new UnauthorizedException("No hay nonce; pedir /auth/nonce primero");
  if (stored.expiresAt.getTime() < Date.now()) {
    throw new UnauthorizedException("Nonce expirado; pedir uno nuevo");
  }

  const message = buildMessage(wallet, stored.nonce);
  let recovered: string;
  try {
    recovered = verifyMessage(message, signature);
  } catch {
    throw new UnauthorizedException("Firma invalida");
  }
  if (recovered.toLowerCase() !== wallet.toLowerCase()) {
    throw new UnauthorizedException("La firma no corresponde a la wallet");
  }
  return wallet.toLowerCase();
}
