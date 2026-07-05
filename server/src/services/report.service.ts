// Servicio de reportes de hito. Guarda el contenido off-chain, calcula el hash
// canonico SHA-256, y -- al observarse la declaracion on-chain -- verifica que el hash
// on-chain coincida con el del contenido almacenado (FR-006/007/008/009).
import { env } from "../config/env";
import { NotFoundException } from "../exceptions/common.exception";
import { MilestoneReport, type ReportFileInput } from "../models/MilestoneReport";
import { MilestoneRepository, milestoneRepository } from "../persistence/repositories/milestone.repository";
import { ReportRepository, reportRepository } from "../persistence/repositories/report.repository";
import { reportStorage, type ReportStorage } from "../persistence/storage";
import { cidV0ToBytes32 } from "../persistence/storage/cid";

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
    // 1) Guardar archivos en el storage, separando media de documentos. Con IPFS,
    //    stored.url ya es un gateway content-addressed y stored.ref es el CID del archivo.
    const namespace = `${projectAddress.toLowerCase()}_${milestoneIndex}_${Date.now()}`;
    const mediaUrls: string[] = [];
    const documentUrls: string[] = [];
    const manifestFiles: { filename: string; cid: string; url: string }[] = [];
    for (const f of files) {
      const stored = await this.storage.put(namespace, f.filename, f.content);
      if (isMedia(f.mimetype)) mediaUrls.push(stored.url);
      else documentUrls.push(stored.url);
      manifestFiles.push({ filename: f.filename, cid: stored.ref, url: stored.url });
    }

    // 2) Valor que va on-chain en reportHash + referencia interna de storage.
    //    - Storage content-addressed (IPFS): pinear un manifest autocontenido (proyecto,
    //      hito, texto y referencias a cada archivo) y codificar su CID en el bytes32.
    //      Asi el "hash" on-chain es a la vez prueba de integridad y direccion para
    //      recuperar el reporte si el frontend se cae.
    //    - Storage local: SHA-256 canonico del contenido (comportamiento previo).
    let computedHash: string;
    let storageRef = namespace;
    if (this.storage.putManifest) {
      const manifest = {
        projectAddress: projectAddress.toLowerCase(),
        milestoneIndex,
        text,
        files: manifestFiles,
      };
      const pinned = await this.storage.putManifest(Buffer.from(JSON.stringify(manifest)));
      computedHash = cidV0ToBytes32(pinned.cid);
      storageRef = pinned.cid;
    } else {
      const hashInput: ReportFileInput[] = files.map((f) => ({
        filename: f.filename,
        content: f.content,
      }));
      computedHash = MilestoneReport.computeHash(projectAddress, milestoneIndex, text, hashInput);
    }

    // 3) Persistir el reporte.
    const report = await this.reports.create({
      projectAddress,
      milestoneIndex,
      text,
      mediaUrls,
      documentUrls,
      computedHash,
      storageRef,
      createdByWallet: wallet,
    });

    // 4) reportUrl on-chain: pagina del proyecto en el frontend si esta configurado (link
    //    legible para humanos); el endpoint del backend como fallback. El reportHash (CID)
    //    es el respaldo si esa pagina no responde.
    const reportId = report.id as number;
    const reportUrl = env.FRONTEND_URL
      ? `${env.FRONTEND_URL.replace(/\/$/, "")}/projects/${projectAddress}/milestones/${milestoneIndex}/report`
      : `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/reports/${reportId}`;
    return { reportId, reportUrl, reportHash: computedHash };
  }

  // Construye la URL del manifest en el gateway configurado (el mismo que sirve los
  // archivos). Se sirve por Pinata, NO por un gateway publico tipo ipfs.io: estos ultimos
  // tienen que DESCUBRIR el contenido en la red y suelen fallar con 502 para CIDs pineados
  // solo en Pinata, mientras que el gateway de Pinata siempre tiene el contenido.
  private withManifestUrl<T extends { cid: string | null }>(
    resp: T,
  ): T & { manifestUrl: string | null } {
    const manifestUrl = resp.cid
      ? `${env.PINATA_GATEWAY.replace(/\/$/, "")}/ipfs/${resp.cid}`
      : null;
    return { ...resp, manifestUrl };
  }

  async getReport(id: number) {
    const report = await this.reports.findById(id);
    if (!report) throw new NotFoundException("Report not found");
    return this.withManifestUrl(report.toResponse());
  }

  async getByProjectMilestone(projectAddress: string, milestoneIndex: number) {
    const report = await this.reports.findLatestByProjectMilestone(projectAddress, milestoneIndex);
    if (!report) throw new NotFoundException("Report not found");
    return this.withManifestUrl(report.toResponse());
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
