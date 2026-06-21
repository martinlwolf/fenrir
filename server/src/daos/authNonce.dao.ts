// DAO de nonces de autenticacion por wallet.
import { prisma } from "./prisma";

export async function upsertNonce(
  wallet: string,
  nonce: string,
  expiresAt: Date,
): Promise<void> {
  const w = wallet.toLowerCase();
  await prisma.authNonce.upsert({
    where: { wallet: w },
    create: { wallet: w, nonce, expiresAt },
    update: { nonce, expiresAt },
  });
}

export async function getNonce(
  wallet: string,
): Promise<{ nonce: string; expiresAt: Date } | null> {
  const row = await prisma.authNonce.findUnique({ where: { wallet: wallet.toLowerCase() } });
  return row ? { nonce: row.nonce, expiresAt: row.expiresAt } : null;
}
