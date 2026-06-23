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

/** ISO datetime -> fecha local corta. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
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
