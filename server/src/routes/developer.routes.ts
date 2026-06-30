// Rutas de developer (identidad + reputacion + subida de verificacion).
import { Router } from "express";
import multer from "multer";
import { registerReadPath } from "../config/docs/openapi";
import { developerController } from "../controllers/developer.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { walletAuth } from "../middlewares/walletAuth";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const developerRouter = Router();

developerRouter.get("/developers", asyncHandler(developerController.list));
developerRouter.get("/developers/:wallet", asyncHandler(developerController.profile));
developerRouter.get("/developers/:wallet/reputation", asyncHandler(developerController.reputation));
developerRouter.post(
  "/developers/:wallet/verification",
  walletAuth,
  upload.single("file"),
  asyncHandler(developerController.uploadVerification),
);

registerReadPath({
  method: "get",
  path: "/developers",
  summary: "Directorio de developers, ordenable y filtrable por su historico (completados/fallidos)",
  tags: ["Developers"],
});
registerReadPath({
  method: "get",
  path: "/developers/{wallet}",
  summary: "Identidad de un developer (razon social, CUIT, verificacion)",
  tags: ["Developers"],
});
registerReadPath({
  method: "get",
  path: "/developers/{wallet}/reputation",
  summary: "Reputacion: certificados de finalizacion y de proyecto fallido",
  tags: ["Developers"],
});
registerReadPath({
  method: "post",
  path: "/developers/{wallet}/verification",
  summary: "Sube material de verificacion de identidad (auth: el propio developer)",
  tags: ["Developers"],
});
