// Rutas de autenticacion por wallet.
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import * as authController from "../controllers/auth.controller";
import { registerReadPath } from "../docs/openapi";

export const authRouter = Router();

authRouter.post("/auth/nonce", asyncHandler(authController.nonce));
authRouter.post("/auth/verify", asyncHandler(authController.verify));

registerReadPath({
  method: "post",
  path: "/auth/nonce",
  summary: "Genera un nonce para firmar con la wallet",
  tags: ["Auth"],
});
registerReadPath({
  method: "post",
  path: "/auth/verify",
  summary: "Verifica la firma de una wallet sobre su nonce",
  tags: ["Auth"],
});
