// Selecciona la implementacion de ReportStorage segun REPORT_STORAGE_DRIVER.
import { env } from "../../config/env";
import type { ReportStorage } from "./ReportStorage";
import { StorageLocal } from "./StorageLocal";

function buildStorage(): ReportStorage {
  switch (env.REPORT_STORAGE_DRIVER) {
    case "local":
      return new StorageLocal();
    default:
      // env.ts ya restringe el enum; esto es defensa en profundidad.
      throw new Error(`REPORT_STORAGE_DRIVER no soportado: ${env.REPORT_STORAGE_DRIVER}`);
  }
}

export const reportStorage: ReportStorage = buildStorage();
export type { ReportStorage, StoredFile } from "./ReportStorage";
