// Mapeo deterministico de proyecto -> foto de edificio (servidas desde client/public/buildings).
// Las fotos son de Unsplash (licencia libre) y viven en el repo para funcionar sin internet.
// El objetivo es puramente presentacional: darle a cada proyecto una identidad visual estable
// (la misma direccion siempre cae en la misma foto) y coherente con su tipo — torres y edificios
// residenciales/comerciales para Inversion; obra publica, plazas y escuelas para Civico.
import type { ProjectTypeValue } from "@shared/constants/enums";

// Pools por tipo. Cada entrada es un archivo en /public/buildings.
const INVESTMENT_POOL = [
  "inv-01",
  "inv-02",
  "inv-03",
  "inv-04",
  "inv-05",
  "inv-06",
  "inv-07",
  "inv-08",
  "inv-09",
  "inv-10",
] as const;

const CIVIC_POOL = [
  "civ-01",
  "civ-02",
  "civ-03",
  "civ-04",
  "civ-05",
  "civ-06",
  "civ-07",
] as const;

// Hash estable y barato (djb2) sobre la direccion. No necesita ser criptografico: solo
// repartir las direcciones por el pool de forma determinista.
function hash(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }
  return Math.abs(h);
}

/** Ruta publica de la foto del proyecto, elegida de forma determinista por direccion + tipo. */
export function buildingImage(
  address: string | null | undefined,
  type: ProjectTypeValue,
): string {
  const pool = type === "Civic" ? CIVIC_POOL : INVESTMENT_POOL;
  const idx = hash((address ?? "0x0").toLowerCase()) % pool.length;
  return `/buildings/${pool[idx]}.jpg`;
}

/** Variante para la landing/marketing donde solo se tiene una semilla libre (ej. ref del proyecto). */
export function buildingImageBySeed(seed: string, type: ProjectTypeValue): string {
  const pool = type === "Civic" ? CIVIC_POOL : INVESTMENT_POOL;
  return `/buildings/${pool[hash(seed) % pool.length]}.jpg`;
}
