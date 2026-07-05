// Thin controller de reportes de hito.
import { createReportBodySchema } from "@shared/schemas/report.schema";
import type { Request, Response } from "express";
import { BadRequestException, UnauthorizedException } from "../exceptions/common.exception";
import { idParamSchema, milestoneParamsSchema } from "../schemas/params";
import { ReportService, reportService } from "../services/report.service";

export class ReportController {
  constructor(private readonly reports: ReportService = reportService) { }

  create = async (req: Request, res: Response): Promise<void> => {
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

    const result = await this.reports.createReport(req.wallet, address, index, text, files);
    res.status(201).json(result);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await this.reports.getReport(id));
  };

  getByMilestone = async (req: Request, res: Response): Promise<void> => {
    const { address, index } = milestoneParamsSchema.parse(req.params);
    res.json(await this.reports.getByProjectMilestone(address, index));
  };

  verification = async (req: Request, res: Response): Promise<void> => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await this.reports.getVerification(id));
  };
}

export const reportController = new ReportController();
