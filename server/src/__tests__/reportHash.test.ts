// Test del hash canonico de reportes (FR-009, SC-002): mismo contenido => mismo
// SHA-256; cualquier cambio => hash distinto (detecta mismatch).
import { describe, it, expect } from "vitest";
import { MilestoneReport } from "../models/MilestoneReport";

const project = "0x1111111111111111111111111111111111111111";

describe("MilestoneReport.computeHash (hash canonico SHA-256)", () => {
  it("es deterministico: mismo contenido => mismo hash", () => {
    const files = [{ filename: "foto.jpg", content: Buffer.from("imagen") }];
    const h1 = MilestoneReport.computeHash(project, 1, "avance del 50%", files);
    const h2 = MilestoneReport.computeHash(project, 1, "avance del 50%", files);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("es estable ante el orden de los archivos", () => {
    const a = { filename: "a.pdf", content: Buffer.from("doc A") };
    const b = { filename: "b.pdf", content: Buffer.from("doc B") };
    const h1 = MilestoneReport.computeHash(project, 2, "texto", [a, b]);
    const h2 = MilestoneReport.computeHash(project, 2, "texto", [b, a]);
    expect(h1).toBe(h2);
  });

  it("cambia si cambia el texto (detecta mismatch)", () => {
    const files = [{ filename: "x.txt", content: Buffer.from("c") }];
    const h1 = MilestoneReport.computeHash(project, 3, "version 1", files);
    const h2 = MilestoneReport.computeHash(project, 3, "version 2", files);
    expect(h1).not.toBe(h2);
  });

  it("cambia si cambia el contenido de un archivo", () => {
    const h1 = MilestoneReport.computeHash(project, 4, "t", [
      { filename: "x.txt", content: Buffer.from("uno") },
    ]);
    const h2 = MilestoneReport.computeHash(project, 4, "t", [
      { filename: "x.txt", content: Buffer.from("dos") },
    ]);
    expect(h1).not.toBe(h2);
  });
});
