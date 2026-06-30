// Helpers de presentacion pura (sin logica de negocio). Convierten lo que entrega la API
// a algo legible. Montos siempre llegan en wei (string).
import { formatEther, parseEther } from "ethers";

/** wei (string) -> "0.0123 ETH" legible. */
export function formatWei(wei: string | null | undefined, maxFractionDigits = 4): string {
  if (wei == null) return "—";
  try {
    const eth = Number(formatEther(wei));
    return `${eth.toLocaleString("es-AR", { maximumFractionDigits: maxFractionDigits })} ETH`;
  } catch {
    return `${wei} wei`;
  }
}

/** input en ETH -> wei (bigint) para pasar a una tx. Lanza si el formato es invalido. */
export function ethToWei(eth: string): bigint {
  return parseEther(eth);
}

/** Direccion 0xabc...1234 acortada para mostrar. */
export function shortAddress(address: string | null | undefined): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Compara dos direcciones sin importar checksum/mayusculas. */
export function sameAddress(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

/** Duracion en segundos (string) -> "7 días" / "1 semana" / "12 h" legible. */
export function formatDuration(seconds: string | null | undefined): string {
  if (seconds == null) return "—";
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return "—";
  const days = Math.round(s / 86400);
  if (days >= 7 && days % 7 === 0) {
    const weeks = days / 7;
    return `${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  }
  if (days >= 1) return `${days} ${days === 1 ? "día" : "días"}`;
  const hours = Math.round(s / 3600);
  return `${hours} h`;
}

/** ISO datetime -> fecha local corta. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

/** True si el deadline ISO ya pasó (sirve para habilitar "Finalizar votación"). */
export function isPast(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

/** Tiempo restante hasta un deadline ISO, en formato corto. */
export function timeRemaining(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return "finalizado";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m ${secs}s`;
}
