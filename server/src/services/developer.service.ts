// Servicio de developer: identidad, material de verificacion off-chain y reputacion
// (certificados de finalizacion/fallido).
import type {
  DeveloperResponse,
  ReputationResponse,
} from "@shared/schemas/developer.schema";
import type { CertificateTypeValue } from "@shared/constants/enums";
import * as developerDao from "../daos/developer.dao";
import * as certificateDao from "../daos/certificate.dao";
import { reportStorage } from "../storage";
import { NotFoundException } from "../exceptions/common";

export async function getProfile(wallet: string): Promise<DeveloperResponse> {
  const developer = await developerDao.findByWallet(wallet);
  if (!developer) throw new NotFoundException("Developer not found");
  return developer.toResponse();
}

export async function getReputation(wallet: string): Promise<ReputationResponse> {
  const certificates = await certificateDao.listByDeveloper(wallet);
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
export async function uploadVerification(
  wallet: string,
  filename: string,
  content: Buffer,
): Promise<{ verificationDocsUrl: string }> {
  const developer = await developerDao.findByWallet(wallet);
  if (!developer) throw new NotFoundException("Developer not found");

  const stored = await reportStorage.put(`developer_${wallet.toLowerCase()}`, filename, content);
  await developerDao.setVerificationDocsUrl(wallet, stored.url);
  return { verificationDocsUrl: stored.url };
}

// Registra un certificado de reputacion al resolverse un proyecto. Llamado desde los
// handlers de ProjectCompleted / SaleExecuted (Completion) y ProjectCancelled (Failure).
export async function recordCertificate(
  projectAddress: string,
  type: CertificateTypeValue,
  mintedAtBlock: bigint,
): Promise<void> {
  const developerWallet = await developerDao.getDeveloperWallet(projectAddress);
  if (!developerWallet) return;
  await certificateDao.record({ type, developerWallet, projectAddress, mintedAtBlock });
}
