// Tarjeta de proyecto + votación que ancla el hero. Reproduce el nodo "EscrowCard" del diseño.
// Datos mockeados (HERO_PROJECT); sin lógica on-chain.
import { HERO_PROJECT } from "./data";

type MilestoneState = "Liberado" | "En votación" | "Pendiente";

const MILESTONE_RIGHT: Record<MilestoneState, string> = {
  Liberado: "text-[var(--fen-verified)]",
  "En votación": "text-[var(--fen-accent)]",
  Pendiente: "text-[var(--fen-muted)]",
};

function MilestoneDot({ n, state }: { n: number; state: MilestoneState }) {
  if (state === "Liberado") {
    return (
      <span className="flex size-[26px] items-center justify-center rounded-full bg-[var(--fen-verified)] text-[13px] font-bold text-white">
        ✓
      </span>
    );
  }
  if (state === "En votación") {
    return (
      <span className="flex size-[26px] items-center justify-center rounded-full bg-[var(--fen-accent)] text-[13px] font-bold text-white">
        {n}
      </span>
    );
  }
  return (
    <span className="flex size-[26px] items-center justify-center rounded-full border border-[var(--fen-border-strong)] bg-[var(--fen-surface-2)] text-[13px] font-bold text-[var(--fen-muted)]">
      {n}
    </span>
  );
}

export function EscrowCard() {
  const p = HERO_PROJECT;
  return (
    <div className="flex w-full flex-col gap-[22px] rounded-[20px] border border-[var(--fen-border)] bg-white p-8 shadow-[0_1px_2px_rgba(20,21,43,0.04)]">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[13px] text-[var(--fen-muted)]">{p.ref}</span>
          <span className="text-2xl font-bold text-[var(--fen-ink)]">{p.name}</span>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--fen-verified-soft)] px-[13px] py-[7px] text-xs font-bold text-[var(--fen-verified)]">
          CÍVICO
        </span>
      </div>

      {/* Progreso de fondeo */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[var(--fen-muted)]">Fondeado</span>
          <span className="font-mono text-[15px] font-bold text-[var(--fen-ink)]">
            {p.funded}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--fen-divider)]">
          <div
            className="h-full rounded-full bg-[var(--fen-accent)]"
            style={{ width: `${p.progressPct}%` }}
          />
        </div>
      </div>

      <div className="h-px w-full bg-[var(--fen-divider)]" />

      {/* Hitos */}
      <div className="flex flex-col gap-4">
        <span className="text-[13px] font-bold tracking-[1px] text-[var(--fen-muted)]">
          HITOS
        </span>
        {p.milestones.map((m) => (
          <div key={m.n} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MilestoneDot n={m.n} state={m.state} />
              <span
                className={
                  "text-[15px] font-medium " +
                  (m.state === "Pendiente"
                    ? "text-[var(--fen-muted)]"
                    : "text-[var(--fen-ink)]")
                }
              >
                {m.label}
              </span>
            </div>
            <span className={"font-mono text-[13px] " + MILESTONE_RIGHT[m.state]}>
              {m.state}
            </span>
          </div>
        ))}
      </div>

      <div className="h-px w-full bg-[var(--fen-divider)]" />

      {/* Acciones de votación */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex-1 rounded-[10px] bg-[var(--fen-verified)] py-3.5 text-[15px] font-bold text-white transition-colors hover:brightness-105"
        >
          Aprobar hito
        </button>
        <button
          type="button"
          className="flex-1 rounded-[10px] border border-[var(--fen-border-strong)] bg-white py-3.5 text-[15px] font-bold text-[var(--fen-ink)] transition-colors hover:bg-[var(--fen-surface)]"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}
