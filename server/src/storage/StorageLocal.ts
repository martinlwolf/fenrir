// Implementacion de ReportStorage sobre el filesystem local. Es la impl inicial para
// la demo; intercambiable por una de Supabase/S3 sin tocar services (research.md).
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "../config/env";
import type { ReportStorage, StoredFile } from "./ReportStorage";

export class StorageLocal implements ReportStorage {
  private readonly baseDir: string;
  private readonly publicBase: string;

  constructor() {
    this.baseDir = path.resolve(env.REPORT_STORAGE_LOCAL_DIR);
    // Los archivos se sirven bajo /files/<ref> (ver app.ts).
    this.publicBase = `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/files`;
  }

  async put(namespace: string, filename: string, content: Buffer): Promise<StoredFile> {
    const safeNs = sanitize(namespace);
    const safeName = sanitize(filename);
    const ref = path.posix.join(safeNs, safeName);
    const fullPath = path.join(this.baseDir, safeNs, safeName);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);

    return { ref, url: `${this.publicBase}/${ref}` };
  }

  async get(ref: string): Promise<Buffer | null> {
    const safeRef = ref.split("/").map(sanitize).join(path.sep);
    const fullPath = path.join(this.baseDir, safeRef);
    // Defensa contra path traversal: el resultado debe seguir dentro de baseDir.
    if (!fullPath.startsWith(this.baseDir)) return null;
    try {
      return await fs.readFile(fullPath);
    } catch {
      return null;
    }
  }
}

// Evita separadores y secuencias de path traversal en namespaces/nombres.
function sanitize(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]/g, "_");
}
