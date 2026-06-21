// Thin controller de developer.
import type { Request, Response } from "express";
import { walletParamSchema } from "../schemas/params";
import { BadRequestException, ForbiddenException, UnauthorizedException } from "../exceptions/common";
import * as developerService from "../services/developer.service";

export async function profile(req: Request, res: Response): Promise<void> {
  const { wallet } = walletParamSchema.parse(req.params);
  res.json(await developerService.getProfile(wallet));
}

export async function reputation(req: Request, res: Response): Promise<void> {
  const { wallet } = walletParamSchema.parse(req.params);
  res.json(await developerService.getReputation(wallet));
}

export async function uploadVerification(req: Request, res: Response): Promise<void> {
  if (!req.wallet) throw new UnauthorizedException("No autenticado");
  const { wallet } = walletParamSchema.parse(req.params);
  // Solo el propio developer puede subir su material de verificacion.
  if (req.wallet !== wallet) throw new ForbiddenException("Solo el propio developer");

  const file = req.file as Express.Multer.File | undefined;
  if (!file) throw new BadRequestException("Falta el archivo de verificacion (campo 'file')");

  res.status(201).json(
    await developerService.uploadVerification(wallet, file.originalname, file.buffer),
  );
}
