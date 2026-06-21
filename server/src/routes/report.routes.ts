// Rutas de reportes de hito. La subida requiere auth por wallet + rol developer; la
// lectura es publica (FR-008).
import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../middlewares/asyncHandler";
import { walletAuth } from "../middlewares/walletAuth";
import { requireDeveloper } from "../middlewares/requireDeveloper";
import * as reportController from "../controllers/report.controller";
import { registerReadPath } from "../docs/openapi";

// Archivos en memoria: el hash se calcula sobre el buffer y luego se delega al
// ReportStorage. Limite por archivo pensado para una demo, no para produccion.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const reportRouter = Router();

reportRouter.post(
  "/projects/:address/milestones/:index/report",
  walletAuth,
  requireDeveloper,
  upload.array("files"),
  asyncHandler(reportController.create),
);
reportRouter.get("/reports/:id", asyncHandler(reportController.get));
reportRouter.get("/reports/:id/verification", asyncHandler(reportController.verification));

registerReadPath({
  method: "post",
  path: "/projects/{address}/milestones/{index}/report",
  summary: "Sube el reporte de un hito; devuelve hash SHA-256 + URL (auth developer)",
  tags: ["Reports"],
});
registerReadPath({
  method: "get",
  path: "/reports/{id}",
  summary: "Sirve el contenido completo de un reporte de hito",
  tags: ["Reports"],
});
registerReadPath({
  method: "get",
  path: "/reports/{id}/verification",
  summary: "Estado de verificacion de hash on-chain vs. contenido",
  tags: ["Reports"],
});
