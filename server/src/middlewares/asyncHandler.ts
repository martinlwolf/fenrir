// Envuelve un handler async para que cualquier rechazo se reenvie al errorHandler
// (Express 4 no captura errores de promesas automaticamente).
import type { NextFunction, Request, RequestHandler, Response } from "express";

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
