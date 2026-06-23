// Interfaz de almacenamiento de archivos de reportes de hito. Mantener la
// implementacion concreta detras de esta interfaz deja la migracion futura a
// Supabase/S3 como un cambio contenido (research.md decision 5).

export interface StoredFile {
  // Identificador interno relativo dentro del storage (storageRef).
  ref: string;
  // URL publica con la que se sirve el archivo.
  url: string;
}

export interface ReportStorage {
  // Guarda el buffer de un archivo bajo un namespace (p.ej. la carpeta del reporte)
  // y un nombre, y devuelve su ref interno + URL publica.
  put(namespace: string, filename: string, content: Buffer): Promise<StoredFile>;

  // Devuelve el contenido de un archivo previamente guardado, o null si no existe.
  get(ref: string): Promise<Buffer | null>;
}
