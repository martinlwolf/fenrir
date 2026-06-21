// Thin controller de autenticacion por wallet.
import type { Request, Response } from "express";
import { nonceRequestSchema, verifyRequestSchema } from "@shared/schemas/auth.schema";
import * as authService from "../services/auth.service";

export async function nonce(req: Request, res: Response): Promise<void> {
  const { wallet } = nonceRequestSchema.parse(req.body);
  res.json(await authService.createNonce(wallet));
}

export async function verify(req: Request, res: Response): Promise<void> {
  const { wallet, signature } = verifyRequestSchema.parse(req.body);
  const verified = await authService.verifyWalletSignature(wallet, signature);
  res.json({ wallet: verified, valid: true });
}
