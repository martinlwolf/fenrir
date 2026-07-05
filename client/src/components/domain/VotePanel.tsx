import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TxFeedback } from "./TxFeedback";
import { VoteProgress } from "./VoteProgress";
import { useWallet } from "@/providers/WalletProvider";
import { useVotingPower } from "@/hooks/useProposals";
import { useWrite } from "@/hooks/useWrite";
import { arbiterDecide, castVote, resolve } from "@/lib/chain/contracts";
import { formatWei } from "@/lib/format";
import type { ProposalResponse } from "@shared/schemas/proposal.schema";

const KIND_LABEL = {
  ArbiterElection: "Elección de árbitro",
  Milestone: "Hito",
  SaleOffer: "Oferta de venta",
} as const;

// Panel de voto Si/No para propuestas de Hito y Oferta de venta (castVote). La eleccion de
// arbitro usa ArbiterElectionPanel.
export function VotePanel({
  projectAddress,
  governorAddress,
  proposal,
  milestoneDescription,
}: {
  projectAddress: string;
  governorAddress: string;
  proposal: ProposalResponse;
  /** Promesa del hito en votación (solo para propuestas de tipo Hito): lo que el developer se
   *  comprometió a entregar. Es contra esto que el inversor verifica el cumplimiento al votar. */
  milestoneDescription?: string;
}) {
  const { address, isOnSepolia } = useWallet();
  const power = useVotingPower(projectAddress, proposal.governorProposalId, address);
  const { phase, error, run } = useWrite([
    ["proposals", projectAddress],
    ["voting-power", projectAddress, proposal.governorProposalId, address],
  ]);
  // El cierre ya confirmo en cadena pero el espejo del backend tarda hasta un ciclo de
  // polling en reflejarlo (D4). Ocultamos el boton de inmediato para no mostrarlo junto al
  // "confirmado"; el polling de useProposals termina de actualizar el estado.
  const [justResolved, setJustResolved] = useState(false);
  // Mismo lag D4 al votar: hasVoted sale del espejo del backend, que tarda un ciclo en
  // reflejar el VoteCast. Ocultamos los botones de inmediato apenas la firma confirma.
  const [justVoted, setJustVoted] = useState(false);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";
  // Los campos active/expired/awaitingArbiter vienen del backend (FR-020): no se recalculan.
  // canResolve combina el flag del backend con el estado local justResolved para evitar
  // mostrar el botón durante el lag D4 entre la tx confirmada y el siguiente ciclo de polling.
  const canResolve = proposal.canResolve && !justResolved;

  function vote(support: boolean) {
    void run(() => castVote(governorAddress, proposal.governorProposalId, support)).then((ok) => {
      if (ok) setJustVoted(true);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {KIND_LABEL[proposal.kind]} #
            {proposal.kind === "Milestone" ? proposal.refId + 1 : proposal.refId}
          </CardTitle>
          {/* Label y variante calculados por el backend (FR-020): el front solo renderiza. */}
          <Badge variant={proposal.display.variant}>{proposal.display.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {proposal.kind === "Milestone" && milestoneDescription && (
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Promesa a verificar</p>
            {/* La promesa puede ser larga y multilinea: preservamos saltos (whitespace-pre-wrap),
                cortamos palabras largas (break-words) y acotamos la altura con scroll para no
                empujar fuera de vista los botones de voto. */}
            <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-sm">
              {milestoneDescription}
            </p>
          </div>
        )}

        {/* Balanza en vivo: A favor/En contra, quórum y cuenta regresiva. */}
        <VoteProgress proposal={proposal} />

        {proposal.result !== "None" && (
          <div className="flex items-center justify-between rounded-md bg-[var(--fen-surface)] px-3 py-2 text-sm">
            <span className="text-[var(--fen-muted)]">Resultado</span>
            <Badge variant={proposal.result === "Approved" ? "success" : "destructive"}>
              {proposal.result === "Approved" ? "Aprobada" : "Rechazada"}
            </Badge>
          </div>
        )}

        {power.data && (
          <div className="flex items-center justify-between rounded-md border border-[var(--fen-border)] px-3 py-2 text-sm">
            <span className="text-[var(--fen-muted)]">Tu poder de voto</span>
            <span className="font-semibold text-[var(--fen-ink)]">
              {formatWei(power.data.votingPower)}
              {power.data.hasVoted && (
                <span className="ml-1.5 text-xs font-medium text-[var(--fen-accent-strong)]">
                  · ya votaste
                </span>
              )}
            </span>
          </div>
        )}

        {proposal.active && !proposal.expired && address && isOnSepolia && power.data && !power.data.hasVoted && !justVoted && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="brand" disabled={busy} onClick={() => vote(true)}>
              <ThumbsUp className="size-4" /> A favor
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              className="border-[color:var(--fen-clay)]/40 text-[var(--fen-clay)] hover:bg-[var(--fen-clay-soft)]"
              onClick={() => vote(false)}
            >
              <ThumbsDown className="size-4" /> En contra
            </Button>
          </div>
        )}

        {proposal.active && !proposal.expired && justVoted && !power.data?.hasVoted && (
          <p className="pt-2 text-xs text-muted-foreground">
            Voto registrado. Actualizando el estado…
          </p>
        )}

        {canResolve && address && isOnSepolia && (
          <div className="pt-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(() => resolve(governorAddress, proposal.governorProposalId)).then((ok) => {
                  if (ok) setJustResolved(true);
                })
              }
            >
              {busy ? "Procesando…" : "Finalizar votación"}
            </Button>
            <p className="pt-1 text-xs text-muted-foreground">
              La votación venció y no se resolvió sola. Cualquiera puede cerrarla.
            </p>
          </div>
        )}

        {proposal.active && proposal.expired && justResolved && (
          <p className="pt-2 text-xs text-muted-foreground">
            Votación cerrada. Actualizando el estado…
          </p>
        )}

        {/* canBreakTie.allowed viene del backend según si la wallet conectada es el árbitro. */}
        {proposal.awaitingArbiter && proposal.viewer.canBreakTie.allowed && address && isOnSepolia && (
          <div className="space-y-1 pt-2">
            <p className="text-sm font-medium">Desempate del árbitro</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(() => arbiterDecide(governorAddress, proposal.governorProposalId, true))
                }
              >
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(() => arbiterDecide(governorAddress, proposal.governorProposalId, false))
                }
              >
                Rechazar
              </Button>
            </div>
          </div>
        )}
        <TxFeedback phase={phase} error={error} />
      </CardContent>
    </Card>
  );
}
