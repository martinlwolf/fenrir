// Generacion del documento OpenAPI a partir de los Zod schemas (una sola definicion
// del contrato, sin duplicar; ver skill backend-architecture). Se sirve en /docs.
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Esquema de error uniforme (lo emite errorHandler).
const errorSchema = registry.register(
  "ApiError",
  z
    .object({
      error: z.string(),
      error_code: z.string(),
      details: z.unknown().optional(),
    })
    .openapi("ApiError"),
);

// Helper para registrar un GET de solo lectura con respuesta generica.
export function registerReadPath(opts: {
  method: "get" | "post";
  path: string;
  summary: string;
  tags: string[];
}): void {
  registry.registerPath({
    method: opts.method,
    path: opts.path,
    summary: opts.summary,
    tags: opts.tags,
    responses: {
      200: { description: "OK" },
      400: {
        description: "Bad Request",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "Not Found",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  });
}

export function buildOpenApiDocument(): object {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Fenrir Backend API",
      version: "0.1.0",
      description:
        "API REST + espejo on-chain de Fenrir. Endpoints de lectura publicos; los de escritura requieren auth por firma de wallet.",
    },
    servers: [{ url: "/" }],
  });
}
