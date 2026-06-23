// Servicio de developer: identidad, material de verificacion off-chain y reputacion
// (certificados de finalizacion/fallido).
import type { CertificateTypeValue } from "@shared/constants/enums";
import type {
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
