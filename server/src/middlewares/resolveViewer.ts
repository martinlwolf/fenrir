// Middleware OPCIONAL que resuelve el "viewer": la wallet que consulta, usada solo como
// hint de UI para que el backend embeba capabilities/estados/labels en los DTOs. NO exige
// firma ni autentica nada: la seguridad real es on-chain (los contratos validan al firmante
// de cada tx, ver constitution Principio II/III). Aca solo leemos un header/query informado
// por el cliente. Por eso nunca bloquea un endpoint publico: si falta o es invalido, sigue
// como viewer anonimo.
import { addressSchema } from "@shared/schemas/common.schema";
import type { NextFunction, Request, Response } from "express";

// Augmenta Express.Request con la wallet del viewer (lowercase o undefined).
declare module "express-serve-static-core" {
  interface Request {
    viewerWallet?: string;
  }
}

export function resolveViewer(req: Request, _res: Response, next: NextFunction): void {
  // Preferimos el header; caemos al query ?viewer=0x.. para enlaces compartibles.
  const raw = req.header("x-wallet-address") ?? req.query.viewer;
  const parsed = addressSchema.safeParse(raw);
  // safeParse ya normaliza a lowercase en el transform del schema. Si falla, viewer anonimo.
  req.viewerWallet = parsed.success ? parsed.data : undefined;
  next();
}
