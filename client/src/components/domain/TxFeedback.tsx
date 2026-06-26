import { Loader2, CheckCircle2, AlertCircle, Radio } from "lucide-react";
import type { TxPhase } from "@/hooks/useWrite";

const PHASES: Record<TxPhase, { label: string; icon: JSX.Element } | null> = {
  idle: null,
  signing: {
    label: "Esperando tu firma en la wallet…",
    icon: <Loader2 className="size-4 animate-spin" />,
  },
  mining: { label: "Confirmando en la red…", icon: <Loader2 className="size-4 animate-spin" /> },
  propagating: {
    label: "Confirmada. Propagándose al backend…",
    icon: <Radio className="size-4 animate-pulse" />,
  },
  confirmed: {
    label: "¡Listo! Acción confirmada.",
    icon: <CheckCircle2 className="size-4 text-emerald-600" />,
  },
  failed: { label: "", icon: <AlertCircle className="size-4 text-destructive" /> },
};

export function TxFeedback({ phase, error }: { phase: TxPhase; error: string | null }) {
  if (phase === "idle") return null;
  if (phase === "failed") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="size-4" /> {error ?? "La transacción falló."}
      </div>
    );
  }
  const info = PHASES[phase];
  if (!info) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {info.icon} {info.label}
    </div>
  );
}
