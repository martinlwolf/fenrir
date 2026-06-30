import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TxFeedback } from "./TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useVotingPower } from "@/hooks/useProposals";
import { useWrite } from "@/hooks/useWrite";
import { arbiterDecide, castVote, resolve } from "@/lib/chain/contracts";
import { formatWei, isPast, timeRemaining } from "@/lib/format";
import type { ProposalResponse } from "@shared/schemas/proposal.schema";

const KIND_LABEL = {
  ArbiterElection: "Elección de árbitro",
  Milestone: "Hito",
  SaleOffer: "Oferta de venta",
} as const;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// Panel de voto Si/No para propuestas de Hito y Oferta de venta (castVote). La eleccion de
// arbitro usa ArbiterElectionPanel.
export function VotePanel({
  projectAddress,
  governorAddress,
  proposal,
  isArbiter = false,
}: {
  projectAddress: string;
  governorAddress: string;
  proposal: ProposalResponse;
  /** La wallet conectada es el árbitro del proyecto (habilita el desempate). */
  isArbiter?: boolean;
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
  const active = proposal.status === "Active";
  const expired = isPast(proposal.deadline);
  // Vencida y sin auto-resolver: cualquiera puede cerrarla (no voto el 100% del poder).
  const canResolve = active && expired && !justResolved;
  // Trabada por empate/falta de quorum: solo el arbitro la destraba.
  const awaitingArbiter = proposal.status === "AwaitingArbiter";

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
            {KIND_LABEL[proposal.kind]} #{proposal.refId}
          </CardTitle>
          <Badge variant={active ? (expired ? "destructive" : "warning") : "secondary"}>
            {active
              ? expired
                ? "Votación vencida"
                : "En votación"
              : proposal.status === "AwaitingArbiter"
                ? "Esperando árbitro"
                : "Resuelta"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Row label="A favor" value={formatWei(proposal.votesFor)} />
        <Row label="En contra" value={formatWei(proposal.votesAgainst)} />
        <Row label="Quórum" value={`${proposal.quorumBps / 100}%${proposal.quorumReached ? " ✓" : ""}`} />
        <Row label="Umbral" value={`${proposal.approvalThresholdBps / 100}%`} />
        {active && !expired && (
          <Row label="Tiempo restante" value={timeRemaining(proposal.deadline)} />
        )}
        {proposal.result !== "None" && (
          <Row label="Resultado" value={proposal.result === "Approved" ? "Aprobada" : "Rechazada"} />
        )}
        {power.data && (
          <Row
            label="Tu poder de voto"
            value={`${formatWei(power.data.votingPower)}${power.data.hasVoted ? " (ya votaste)" : ""}`}
          />
        )}

        {active && !expired && address && isOnSepolia && !power.data?.hasVoted && !justVoted && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" disabled={busy} onClick={() => vote(true)}>
              A favor
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => vote(false)}>
              En contra
            </Button>
          </div>
        )}

        {active && !expired && justVoted && !power.data?.hasVoted && (
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

        {active && expired && justResolved && (
          <p className="pt-2 text-xs text-muted-foreground">
            Votación cerrada. Actualizando el estado…
          </p>
        )}

        {awaitingArbiter && isArbiter && address && isOnSepolia && (
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
