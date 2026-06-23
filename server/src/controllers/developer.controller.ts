// Thin controller de developer.
import type { Request, Response } from "express";
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "../exceptions/common.exception";
import { walletParamSchema } from "../schemas/params";
import { DeveloperService, developerService } from "../services/developer.service";

export class DeveloperController {
  constructor(private readonly developers: DeveloperService = developerService) { }

  profile = async (req: Request, res: Response): Promise<void> => {
    const { wallet } = walletParamSchema.parse(req.params);
    res.json(await this.developers.getProfile(wallet));
  };

  reputation = async (req: Request, res: Response): Promise<void> => {
    const { wallet } = walletParamSchema.parse(req.params);
    res.json(await this.developers.getReputation(wallet));
  };

  uploadVerification = async (req: Request, res: Response): Promise<void> => {
    if (!req.wallet) throw new UnauthorizedException("No autenticado");
    const { wallet } = walletParamSchema.parse(req.params);
    // Solo el propio developer puede subir su material de verificacion.
    if (req.wallet !== wallet) throw new ForbiddenException("Solo el propio developer");

    const file = req.file as Express.Multer.File | undefined;
    if (!file) throw new BadRequestException("Falta el archivo de verificacion (campo 'file')");

    res
      .status(201)
      .json(await this.developers.uploadVerification(wallet, file.originalname, file.buffer));
  };
}

export const developerController = new DeveloperController();
