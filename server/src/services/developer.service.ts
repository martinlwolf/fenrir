// Servicio de developer: identidad, material de verificacion off-chain y reputacion
// (certificados de finalizacion/fallido).
import type { CertificateTypeValue } from "@shared/constants/enums";
import type {
  DeveloperListQuery,
  DeveloperListResponse,
  DeveloperResponse,
  ReputationResponse,
} from "@shared/schemas/developer.schema";
import { NotFoundException } from "../exceptions/common.exception";
import { CertificateRepository, certificateRepository } from "../persistence/repositories/certificate.repository";
import { DeveloperRepository, developerRepository } from "../persistence/repositories/developer.repository";
import { reportStorage, type ReportStorage } from "../persistence/storage";

export class DeveloperService {
  constructor(
    private readonly developers: DeveloperRepository = developerRepository,
    private readonly certificates: CertificateRepository = certificateRepository,
    private readonly storage: ReportStorage = reportStorage,
  ) { }

  async getProfile(wallet: string): Promise<DeveloperResponse> {
    const developer = await this.developers.findByWallet(wallet);
    if (!developer) throw new NotFoundException("Developer not found");
    return developer.toResponse();
  }

  // Directorio de developers, ordenable y filtrable por su historico (completados/fallidos).
  // El filtro/orden/paginado se aplica aca sobre el universo enriquecido por el repositorio;
  // el conteo de developers de un proyecto de seminario es chico y no amerita SQL dedicado.
  async listDevelopers(query: DeveloperListQuery): Promise<DeveloperListResponse> {
    const all = await this.developers.listWithReputation();

    const filtered = all.filter((d) => {
      if (query.filter === "withCompleted") return d.completed > 0;
      if (query.filter === "withFailed") return d.failed > 0;
      return true;
    });

    const dir = query.order === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      if (query.sort === "razonSocial") {
        return dir * a.razonSocial.localeCompare(b.razonSocial);
      }
      const diff = query.sort === "failed" ? a.failed - b.failed : a.completed - b.completed;
      // Desempate estable por razon social para un orden determinista.
      return diff !== 0 ? dir * diff : a.razonSocial.localeCompare(b.razonSocial);
    });

    const total = filtered.length;
    const start = (query.page - 1) * query.pageSize;
    const items = filtered.slice(start, start + query.pageSize).map((d) => ({
      wallet: d.wallet,
      razonSocial: d.razonSocial,
      cuit: d.cuit,
      completed: d.completed,
      failed: d.failed,
    }));

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getReputation(wallet: string): Promise<ReputationResponse> {
    const certificates = await this.certificates.listByDeveloper(wallet);
    const completed = certificates.filter((c) => c.type === "Completion").length;
    const failed = certificates.filter((c) => c.type === "Failure").length;
    return {
      wallet: wallet.toLowerCase(),
      completed,
      failed,
      certificates: certificates.map((c) => c.toResponse()),
    };
  }

  // Sube material de verificacion de identidad off-chain (complementa, no reemplaza, la
  // verificacion on-chain razon social + CUIT de business_rules/roles.md).
  async uploadVerification(
    wallet: string,
    filename: string,
    content: Buffer,
  ): Promise<{ verificationDocsUrl: string }> {
    const developer = await this.developers.findByWallet(wallet);
    if (!developer) throw new NotFoundException("Developer not found");

    const stored = await this.storage.put(`developer_${wallet.toLowerCase()}`, filename, content);
    await this.developers.setVerificationDocsUrl(wallet, stored.url);
    return { verificationDocsUrl: stored.url };
  }

  // Registra un certificado de reputacion al resolverse un proyecto. Llamado desde los
  // handlers de ProjectCompleted / SaleExecuted (Completion) y ProjectCancelled (Failure).
  async recordCertificate(
    projectAddress: string,
    type: CertificateTypeValue,
    mintedAtBlock: bigint,
  ): Promise<void> {
    const developerWallet = await this.developers.getDeveloperWallet(projectAddress);
    if (!developerWallet) return;
    await this.certificates.record({ type, developerWallet, projectAddress, mintedAtBlock });
  }
}

export const developerService = new DeveloperService();
