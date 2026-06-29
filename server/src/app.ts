// Construccion de la app Express: middlewares base, archivos estaticos de reportes,
// rutas del API, documentacion OpenAPI en /docs, health check, y el manejo
// centralizado de errores al final.
import express, { type Express } from "express";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import { buildOpenApiDocument } from "./config/docs/openapi";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { ingestionRepository } from "./persistence/repositories/ingestion.repository";
import { buildApiRouter } from "./routes";

export function buildApp(): Express {
  const app = express();

  // CORS: el frontend (Vite en :5173, deploy en Vercel) consume esta API desde otro
  // origen. La auth es por header (Authorization: Wallet <...>), no por cookie, asi que
  // reflejar el origin y permitir ese header alcanza. Responde el preflight OPTIONS.
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin ?? "*");
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "1mb" }));

  // Archivos de reportes servidos estaticamente (driver local). El contenido en
  // estas URLs debe coincidir siempre con el reportHash on-chain (FR-008/FR-009).
  app.use("/files", express.static(path.resolve(env.REPORT_STORAGE_LOCAL_DIR)));

  // Health: liveness + estado del listener (ultimo bloque procesado).
  app.get("/health", async (_req, res) => {
    const lastBlock = await ingestionRepository.getCursor("sepolia:main");
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
