// Middleware de rol: exige que la wallet autenticada este registrada como developer
// (reflejo del evento DeveloperRegistered). Debe usarse despues de walletAuth.
import type { NextFunction, Request, Response } from "express";
import { ForbiddenException, UnauthorizedException } from "../exceptions/common.exception";
import { projectRepository } from "../persistence/repositories/project.repository";

export async function requireDeveloper(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.wallet) throw new UnauthorizedException("No autenticado");
    const exists = await projectRepository.developerExists(req.wallet);
    if (!exists) throw new ForbiddenException("La wallet no esta registrada como developer");
    next();
  } catch (err) {
    next(err);
  }
}
