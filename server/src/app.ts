// Construccion de la app Express: middlewares base, archivos estaticos de reportes,
// rutas del API, documentacion OpenAPI en /docs, health check, y el manejo
// centralizado de errores al final.
import express, { type Express } from "express";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { buildApiRouter } from "./routes";
import { buildOpenApiDocument } from "./docs/openapi";
import { getCursor } from "./daos/ingestion.dao";

export function buildApp(): Express {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  // Archivos de reportes servidos estaticamente (driver local). El contenido en
  // estas URLs debe coincidir siempre con el reportHash on-chain (FR-008/FR-009).
  app.use("/files", express.static(path.resolve(env.REPORT_STORAGE_LOCAL_DIR)));

  // Health: liveness + estado del listener (ultimo bloque procesado).
  app.get("/health", async (_req, res) => {
    const lastBlock = await getCursor("sepolia:main");
    res.json({
      status: "ok",
      listener: { lastProcessedBlock: lastBlock ? lastBlock.toString() : null },
    });
  });

  // API.
  app.use(buildApiRouter());

  // Documentacion.
  const openapiDoc = buildOpenApiDocument();
  app.get("/openapi.json", (_req, res) => res.json(openapiDoc));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));

  // Manejo centralizado de errores (siempre al final).
  app.use(errorHandler);

  return app;
}
