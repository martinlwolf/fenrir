// Objeto de negocio Developer (espejo de FenrirFactory.developers + material de
// verificacion off-chain).
import type { DeveloperResponse } from "@shared/schemas/developer.schema";

export interface DeveloperProps {
  wallet: string;
  razonSocial: string;
  cuit: string;
  verificationDocsUrl: string | null;
}

export class Developer {
  constructor(private readonly props: DeveloperProps) {}

  toResponse(): DeveloperResponse {
    const p = this.props;
    return {
      wallet: p.wallet,
      razonSocial: p.razonSocial,
      cuit: p.cuit,
      verificationDocsUrl: p.verificationDocsUrl,
    };
  }
}
