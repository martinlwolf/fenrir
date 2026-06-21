// Thin controller de autenticacion por wallet.
import type { Request, Response } from "express";
import { nonceRequestSchema, verifyRequestSchema } from "@shared/schemas/auth.schema";
import { AuthService, authService } from "../services/auth.service";

export class AuthController {
  constructor(private readonly auth: AuthService = authService) {}

  nonce = async (req: Request, res: Response): Promise<void> => {
    const { wallet } = nonceRequestSchema.parse(req.body);
    res.json(await this.auth.createNonce(wallet));
  };

  verify = async (req: Request, res: Response): Promise<void> => {
    const { wallet, signature } = verifyRequestSchema.parse(req.body);
    const verified = await this.auth.verifyWalletSignature(wallet, signature);
    res.json({ wallet: verified, valid: true });
  };
}

export const authController = new AuthController();
