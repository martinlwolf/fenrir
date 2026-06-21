// Objeto de negocio Reporte de hito. Contiene la logica de como se forma el hash
// canonico SHA-256 del reporte: el backend es la autoridad que lo calcula, y el
// developer copia ese hash a la transaccion on-chain declareMilestone. Por eso la
// serializacion solo necesita ser deterministica del lado del backend (research.md 3).
import { createHash } from "node:crypto";

export interface ReportFileInput {
  filename: string;
  content: Buffer;
}

export interface MilestoneReportProps {
  id?: number;
  projectAddress: string;
  milestoneIndex: number;
  text: string;
  mediaUrls: string[];
  documentUrls: string[];
  computedHash: string;
  onChainHash: string | null;
  hashMatch: boolean | null;
  storageRef: string;
  createdByWallet: string;
}

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export class MilestoneReport {
  constructor(private readonly props: MilestoneReportProps) {}

  // Hash canonico: SHA-256 de un manifest determinista (texto + nombre/hash de cada
  // archivo, ordenado por nombre). Devuelto como bytes32 hex ("0x" + 64 hex), que es
  // exactamente lo que el contrato guarda en reportHash.
  static computeHash(
    projectAddress: string,
    milestoneIndex: number,
    text: string,
    files: ReportFileInput[],
  ): string {
    const fileEntries = [...files]
      .map((f) => ({ name: f.filename, sha256: sha256Hex(f.content) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const manifest = JSON.stringify({
      projectAddress: projectAddress.toLowerCase(),
      milestoneIndex,
      text,
      files: fileEntries,
    });

    return `0x${sha256Hex(manifest)}`;
  }

  get id(): number | undefined {
    return this.props.id;
  }

  get computedHash(): string {
    return this.props.computedHash;
  }

  toResponse(): {
    id: number | undefined;
    projectAddress: string;
    milestoneIndex: number;
    text: string;
    mediaUrls: string[];
    documentUrls: string[];
    reportHash: string;
  } {
    const p = this.props;
    return {
      id: p.id,
      projectAddress: p.projectAddress,
      milestoneIndex: p.milestoneIndex,
      text: p.text,
      mediaUrls: p.mediaUrls,
      documentUrls: p.documentUrls,
      reportHash: p.computedHash,
    };
  }

  toVerification(): { computedHash: string; onChainHash: string | null; hashMatch: boolean | null } {
    return {
      computedHash: this.props.computedHash,
      onChainHash: this.props.onChainHash,
      hashMatch: this.props.hashMatch,
    };
  }
}
