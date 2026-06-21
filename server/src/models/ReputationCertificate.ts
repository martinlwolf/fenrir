// Objeto de negocio Certificado de reputacion (Finalizacion o Proyecto Fallido),
// soulbound on-chain, enlazado a su proyecto de origen.
import type { CertificateTypeValue } from "@shared/constants/enums";
import type { CertificateResponse } from "@shared/schemas/developer.schema";

export interface ReputationCertificateProps {
  type: CertificateTypeValue;
  tokenId: number;
  projectAddress: string;
  mintedAtBlock: bigint;
}

export class ReputationCertificate {
  constructor(private readonly props: ReputationCertificateProps) {}

  get type(): CertificateTypeValue {
    return this.props.type;
  }

  toResponse(): CertificateResponse {
    const p = this.props;
    return {
      type: p.type,
      tokenId: p.tokenId,
      projectAddress: p.projectAddress,
      mintedAtBlock: p.mintedAtBlock.toString(),
    };
  }
}
