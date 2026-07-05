import { useEffect, useState } from "react";

export interface Countdown {
  /** Milisegundos restantes (0 si ya venció). */
  ms: number;
  expired: boolean;
  /** Etiqueta legible que baja hasta el segundo: "2h 14m 03s", "45m 12s", "08s". */
  label: string;
}

function format(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}d ${pad(hours)}h ${pad(mins)}m`;
  if (hours > 0) return `${hours}h ${pad(mins)}m ${pad(secs)}s`;
  if (mins > 0) return `${mins}m ${pad(secs)}s`;
  return `${secs}s`;
}

// Cuenta regresiva en vivo hasta un deadline ISO. Tickea cada segundo para que la votacion se
// sienta "en tiempo real" (la UI no espera al proximo refetch para mostrar el tiempo bajar).
export function useCountdown(deadlineIso: string | null | undefined): Countdown {
  const target = deadlineIso ? new Date(deadlineIso).getTime() : NaN;
  const compute = (): number => {
    if (Number.isNaN(target)) return 0;
    return Math.max(0, target - Date.now());
  };
  const [ms, setMs] = useState(compute);

  useEffect(() => {
    if (Number.isNaN(target)) return;
    setMs(compute());
    const id = setInterval(() => setMs(compute()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineIso]);

  return { ms, expired: ms <= 0, label: format(ms) };
}
