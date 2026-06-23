// Servicio de reportes de hito. Guarda el contenido off-chain, calcula el hash
// canonico SHA-256, y -- al observarse la declaracion on-chain -- verifica que el hash
// on-chain coincida con el del contenido almacenado (FR-006/007/008/009).
import { env } from "../config/env";
import { NotFoundException } from "../exceptions/common.exception";
import { MilestoneReport, type ReportFileInput } from "../models/MilestoneReport";
import { MilestoneRepository, milestoneRepository } from "../persistence/repositories/milestone.repository";
import { ReportRepository, reportRepository } from "../persistence/repositories/report.repository";
import { reportStorage, type ReportStorage } from "../persistence/storage";

export interface ReportFileUpload {
  filename: string;
  content: Buffer;
  mimetype: string;
}

export interface CreateReportResult {
  reportId: number;
  reportUrl: string;
  reportHash: string;
}

function isMedia(mimetype: string): boolean {
  return mimetype.startsWith("image/") || mimetype.startsWith("video/");
}

export class ReportService {
  constructor(
    private readonly reports: ReportRepository = reportRepository,
    private readonly milestones: MilestoneRepository = milestoneRepository,
    private readonly storage: ReportStorage = reportStorage,
  ) { }

  async createReport(
    wallet: string,
    projectAddress: string,
    milestoneIndex: number,
    text: string,
    files: ReportFileUpload[],
  ): Promise<CreateReportResult> {
    // 1) Hash canonico sobre texto + archivos (lo que ira on-chain).
    const hashInput: ReportFileInput[] = files.map((f) => ({
      filename: f.filename,
      content: f.content,
    }));
    const computedHash = MilestoneReport.computeHash(
      projectAddress,
      milestoneIndex,
      text,
      hashInput,
    );

    // 2) Guardar archivos en el storage, separando media de documentos.
    const namespace = `${projectAddress.toLowerCase()}_${milestoneIndex}_${Date.now()}`;
    const mediaUrls: string[] = [];
    const documentUrls: string[] = [];
    for (const f of files) {
      const stored = await this.storage.put(namespace, f.filename, f.content);
      if (isMedia(f.mimetype)) mediaUrls.push(stored.url);
      else documentUrls.push(stored.url);
    }

    // 3) Persistir el reporte.
    const report = await this.reports.create({
      projectAddress,
      milestoneIndex,
      text,
      mediaUrls,
      documentUrls,
      computedHash,
      storageRef: namespace,
      createdByWallet: wallet,
    });

    const reportId = report.id as number;
    const reportUrl = `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/reports/${reportId}`;
    return { reportId, reportUrl, reportHash: computedHash };
  }

  async getReport(id: number): Promise<ReturnType<MilestoneReport["toResponse"]>> {
    const report = await this.reports.findById(id);
    if (!report) throw new NotFoundException("Report not found");
    return report.toResponse();
  }

  async getVerification(id: number): Promise<ReturnType<MilestoneReport["toVerification"]>> {
    const report = await this.reports.findById(id);
    if (!report) throw new NotFoundException("Report not found");
    return report.toVerification();
  }

  // Llamado al observar MilestoneDeclared(reportHash, reportUrl): verifica que el hash
  // on-chain coincida con el de algun reporte almacenado para ese hito. Si coincide,
  // enlaza el reporte al milestone y marca hashMatch=true; si no, registra la
  // discrepancia (FR-009) en vez de aceptarla en silencio.
  async verifyOnChainDeclaration(
    projectAddress: string,
    milestoneIndex: number,
    onChainHash: string,
  ): Promise<void> {
    const match = await this.reports.findByProjectMilestoneAndHash(
      projectAddress,
      milestoneIndex,
      onChainHash,
    );
    const milestoneId = await this.milestones.findId(projectAddress, milestoneIndex);

    if (match) {
      await this.reports.linkAndVerify(match.id, milestoneId, onChainHash, true);
    } else {
      await this.reports.recordOrphanDeclaration(projectAddress, milestoneIndex, onChainHash);
    }
  }
}

export const reportService = new ReportService();
