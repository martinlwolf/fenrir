// Implementacion de ReportStorage sobre IPFS via Pinata. A diferencia de StorageLocal,
// el contenido queda direccionado por su hash (CID) y servido por la red, asi que
// sobrevive a la caida del backend: con el CID guardado on-chain cualquiera recupera el
// reporte desde un gateway publico. Se fuerza CIDv0 para que el digest entre en el
// bytes32 del reportHash (ver cid.ts).
import { env } from "../../config/env";
import type { ReportStorage, StoredFile } from "./ReportStorage";

const PIN_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export class StorageIPFS implements ReportStorage {
  private readonly jwt: string;
  private readonly gateway: string;

  constructor() {
    if (!env.PINATA_JWT) {
      throw new Error("REPORT_STORAGE_DRIVER=ipfs requiere PINATA_JWT");
    }
    this.jwt = env.PINATA_JWT;
    this.gateway = env.PINATA_GATEWAY.replace(/\/$/, "");
  }

  private gatewayUrl(cid: string): string {
    return `${this.gateway}/ipfs/${cid}`;
  }

  // Pinea un buffer y devuelve su CIDv0. cidVersion: 0 es obligatorio para el truco
  // CID<->bytes32; con CIDv1 el digest no se reconstruye igual.
  private async pin(filename: string, content: Buffer, contentType: string): Promise<string> {
    const form = new FormData();
    form.append("file", new Blob([content], { type: contentType }), filename);
    form.append("pinataOptions", JSON.stringify({ cidVersion: 0 }));

    const res = await fetch(PIN_FILE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.jwt}` },
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Pinata pin fallo (${res.status}): ${detail}`);
    }
    const json = (await res.json()) as { IpfsHash?: string };
    if (!json.IpfsHash) throw new Error("Pinata no devolvio IpfsHash");
    return json.IpfsHash;
  }

  async put(_namespace: string, filename: string, content: Buffer): Promise<StoredFile> {
    const cid = await this.pin(filename, content, "application/octet-stream");
    return { ref: cid, url: this.gatewayUrl(cid) };
  }

  async putManifest(content: Buffer): Promise<{ cid: string; url: string }> {
    const cid = await this.pin("manifest.json", content, "application/json");
    return { cid, url: this.gatewayUrl(cid) };
  }

  async get(ref: string): Promise<Buffer | null> {
    const res = await fetch(this.gatewayUrl(ref));
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
}
