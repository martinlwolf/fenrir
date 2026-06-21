// Thin controller de reportes de hito.
import type { Request, Response } from "express";
import { createReportBodySchema } from "@shared/schemas/report.schema";
import { idParamSchema, milestoneParamsSchema } from "../schemas/params";
import { BadRequestException, UnauthorizedException } from "../exceptions/common";
import * as reportService from "../services/report.service";

export async function create(req: Request, res: Response): Promise<void> {
  if (!req.wallet) throw new UnauthorizedException("No autenticado");
  const { address, index } = milestoneParamsSchema.parse(req.params);
  const { text } = createReportBodySchema.parse(req.body);

  const uploaded = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (uploaded.length === 0 && text.trim() === "") {
    throw new BadRequestException("El reporte necesita texto o al menos un archivo");
  }
  const files = uploaded.map((f) => ({
    filename: f.originalname,
    content: f.buffer,
    mimetype: f.mimetype,
  }));

  const result = await reportService.createReport(req.wallet, address, index, text, files);
  res.status(201).json(result);
}

export async function get(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.json(await reportService.getReport(id));
}

export async function verification(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.json(await reportService.getVerification(id));
}
