// Middleware de autenticacion por firma de wallet. Lee los headers x-wallet-address y
// x-wallet-signature, verifica la firma contra el nonce vigente y adjunta req.wallet.
import { addressSchema } from "@shared/schemas/common.schema";
import type { NextFunction, Request, Response } from "express";
import { UnauthorizedException } from "../exceptions/common.exception";
import { authService } from "../services/auth.service";

// Augmenta Express.Request con la wallet autenticada.
declare module "express-serve-static-core" {
  interface Request {
    wallet?: string;
  }
}

export async function walletAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const rawWallet = req.header("x-wallet-address");
    const signature = req.header("x-wallet-signature");
    if (!rawWallet || !signature) {
      throw new UnauthorizedException("Faltan headers x-wallet-address / x-wallet-signature");
    }
    const wallet = addressSchema.parse(rawWallet);
    req.wallet = await authService.verifyWalletSignature(wallet, signature);
    next();
  } catch (err) {
    next(err);
  }
}
