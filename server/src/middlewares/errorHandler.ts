// Manejo centralizado de errores. Mapea FenrirException y ZodError a la respuesta
// uniforme { error, error_code, details }. Todo lo demas es 500.
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger";
import { FenrirException } from "../exceptions/fernrir.exception";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // next es requerido por Express para reconocer esto como error handler.
  _next: NextFunction,
): void {
  if (err instanceof FenrirException) {
    res.status(err.status_code).json({
      error: err.error,
      error_code: err.error_code,
      details: err.details,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      error_code: "BAD_REQUEST",
      details: err.issues,
    });
    return;
  }

  logger.error({ err }, "unhandled error");
  res.status(500).json({ error: "Internal Server Error", error_code: "INTERNAL" });
}
