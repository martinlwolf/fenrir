// Visualizacion en vivo de una votacion del DAO: una "balanza" entre A favor / En contra, el
// avance del quorum (cuanto poder de voto se sumo y cuanto falta) y la cuenta regresiva al
// segundo. Es solo presentacion: los numeros salen de la propuesta (que el backend refresca por
// polling cada 4s mientras esta activa), aca se interpretan y animan.
import { Check, Clock, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useCountdown } from "@/hooks/useCountdown";
import { formatWei } from "@/lib/format";
import type { ProposalResponse } from "@shared/schemas/proposal.schema";

function bn(x: string): bigint {
  try {
    return BigInt(x);
  } catch {
    return 0n;
  }
}

/** Porcentaje (0-100, con 1 decimal) de part sobre whole, a prueba de division por cero. */
function pct(part: bigint, whole: bigint): number {
  if (whole <= 0n) return 0;
  return Number((part * 10000n) / whole) / 100;
}

export function VoteProgress({
  proposal,
  active,
  expired,
}: {
  proposal: ProposalResponse;
  active: boolean;
  expired: boolean;
}) {
  const countdown = useCountdown(proposal.deadline);

  const votesFor = bn(proposal.votesFor);
  const votesAgainst = bn(proposal.votesAgainst);
  const voted = votesFor + votesAgainst;
  const totalPower = bn(proposal.totalPowerAtSnapshot);

  const forPct = pct(votesFor, voted); // del total votado
  const againstPct = voted > 0n ? 100 - forPct : 0;
  const thresholdPct = proposal.approvalThresholdBps / 100; // umbral de aprobacion (sobre lo votado)

  const participationPct = pct(voted, totalPower); // del poder total al snapshot
  const quorumPct = proposal.quorumBps / 100;
  const quorumTarget = (totalPower * BigInt(proposal.quorumBps)) / 10000n;
  const quorumRemaining = quorumTarget > voted ? quorumTarget - voted : 0n;

  // Hacia donde se inclina la balanza (solo informativo mientras transcurre).
  const lead =
    voted === 0n
      ? "none"
      : votesFor > votesAgainst
        ? "for"
        : votesAgainst > votesFor
          ? "against"
          : "tie";
  const passing = forPct >= thresholdPct && proposal.quorumReached;

  return (
    <div className="space-y-4">
      {/* Encabezado: hacia donde se inclina + cuenta regresiva en vivo */}
      <div className="flex items-center justify-between gap-3">
        <LeadPill lead={lead} passing={passing} active={active} expired={expired} />
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
            active && !expired
              ? countdown.ms < 60_000
                ? "bg-[var(--fen-clay-soft)] text-[var(--fen-clay)]"
                : "bg-[var(--fen-surface-2)] text-[var(--fen-ink-2)]"
              : "bg-[var(--fen-surface-2)] text-[var(--fen-muted)]"
          }`}
        >
          <Clock className="size-3.5" />
          {active && !expired ? `Cierra en ${countdown.label}` : "Votación cerrada"}
        </span>
      </div>

      {/* Balanza A favor / En contra */}
      <div className="space-y-1.5">
        <div className="relative h-7 w-full overflow-hidden rounded-lg bg-[var(--fen-divider)]">
          {voted > 0n ? (
            <div className="flex h-full w-full">
              <div
                className="flex h-full items-center justify-start bg-[var(--fen-accent)] pl-2 transition-[width] duration-500 ease-out"
                style={{ width: `${forPct}%` }}
              >
                {forPct >= 14 && (
                  <span className="text-[11px] font-bold text-white">{forPct.toFixed(0)}%</span>
                )}
              </div>
              <div
                className="flex h-full items-center justify-end bg-[var(--fen-clay)] pr-2 transition-[width] duration-500 ease-out"
                style={{ width: `${againstPct}%` }}
              >
                {againstPct >= 14 && (
                  <span className="text-[11px] font-bold text-white">
                    {againstPct.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] font-medium text-[var(--fen-muted)]">
              Sin votos todavía
            </div>
          )}

          {/* Marca del umbral de aprobación */}
          <div
            className="absolute inset-y-0 w-0.5 bg-[var(--fen-ink)]/70"
            style={{ left: `${thresholdPct}%` }}
            title={`Umbral de aprobación: ${thresholdPct}%`}
          >
            <span className="absolute -top-px left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[var(--fen-ink)]" />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-[var(--fen-accent-strong)]">
            <span className="size-2 rounded-full bg-[var(--fen-accent)]" />
            A favor · {formatWei(proposal.votesFor)}
          </span>
          <span className="text-[var(--fen-muted)]">umbral {thresholdPct}%</span>
          <span className="flex items-center gap-1.5 font-medium text-[var(--fen-clay)]">
            En contra · {formatWei(proposal.votesAgainst)}
            <span className="size-2 rounded-full bg-[var(--fen-clay)]" />
          </span>
        </div>
      </div>

      {/* Quórum: cuánto poder de voto se sumó y cuánto falta */}
      <div className="space-y-1.5 rounded-lg border border-[var(--fen-border)] bg-[var(--fen-surface)] p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--fen-ink-2)]">Quórum</span>
          {proposal.quorumReached ? (
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--fen-accent-strong)]">
              <Check className="size-3.5" /> Alcanzado
            </span>
          ) : (
            <span className="text-[var(--fen-muted)]">
              Faltan {formatWei(quorumRemaining.toString())}
            </span>
          )}
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--fen-divider)]">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${
              proposal.quorumReached ? "bg-[var(--fen-accent)]" : "bg-[var(--fen-amber)]"
            }`}
            style={{ width: `${Math.min(100, participationPct)}%` }}
          />
          {/* Marca del quórum requerido */}
          <div
            className="absolute inset-y-0 w-0.5 bg-[var(--fen-ink)]/60"
            style={{ left: `${Math.min(100, quorumPct)}%` }}
            title={`Quórum requerido: ${quorumPct}%`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--fen-muted)]">
          <span>
            Participación{" "}
            <span className="font-semibold text-[var(--fen-ink-2)]">
              {participationPct.toFixed(1)}%
            </span>{" "}
            · {formatWei(proposal.weightVoted)} de {formatWei(proposal.totalPowerAtSnapshot)}
          </span>
          <span>requiere {quorumPct}%</span>
        </div>
      </div>
    </div>
  );
}

function LeadPill({
  lead,
  passing,
  active,
  expired,
}: {
  lead: "none" | "for" | "against" | "tie";
  passing: boolean;
  active: boolean;
  expired: boolean;
}) {
  if (active && !expired) {
    if (lead === "for")
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--fen-accent-strong)]">
          <TrendingUp className="size-4" />
          {passing ? "Rumbo a aprobarse" : "Gana el Sí"}
        </span>
      );
    if (lead === "against")
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--fen-clay)]">
          <TrendingDown className="size-4" />
          Gana el No
        </span>
      );
    if (lead === "tie")
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--fen-amber)]">
          <Minus className="size-4" /> Empate
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--fen-muted)]">
        Esperando votos
      </span>
    );
  }
  // Cerrada: mostramos el desenlace según hacia dónde quedó.
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
        lead === "for" ? "text-[var(--fen-accent-strong)]" : "text-[var(--fen-muted)]"
      }`}
    >
      {lead === "for" ? <TrendingUp className="size-4" /> : <Minus className="size-4" />}
      Votación finalizada
    </span>
  );
}
