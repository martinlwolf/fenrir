// Repositorio de nonces de autenticacion por wallet.
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export class AuthNonceRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async upsertNonce(wallet: string, nonce: string, expiresAt: Date): Promise<void> {
    const w = wallet.toLowerCase();
    await this.db.authNonce.upsert({
      where: { wallet: w },
      create: { wallet: w, nonce, expiresAt },
      update: { nonce, expiresAt },
    });
  }

  async getNonce(wallet: string): Promise<{ nonce: string; expiresAt: Date } | null> {
    const row = await this.db.authNonce.findUnique({ where: { wallet: wallet.toLowerCase() } });
    return row ? { nonce: row.nonce, expiresAt: row.expiresAt } : null;
  }
}

export const authNonceRepository = new AuthNonceRepository();
