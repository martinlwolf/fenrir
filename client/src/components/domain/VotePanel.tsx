import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TxFeedback } from "./TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useVotingPower } from "@/hooks/useProposals";
import { useWrite } from "@/hooks/useWrite";
import { castVote } from "@/lib/chain/contracts";
import { formatWei, timeRemaining } from "@/lib/format";
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
}: {
  projectAddress: string;
  governorAddress: string;
  proposal: ProposalResponse;
}) {
  const { address, isOnSepolia } = useWallet();
  const power = useVotingPower(projectAddress, proposal.governorProposalId, address);
  const { phase, error, run } = useWrite([
    ["proposals", projectAddress],
    ["voting-power", projectAddress, proposal.governorProposalId, address],
  ]);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";
  const active = proposal.status === "Active";

  function vote(support: boolean) {
    void run(() => castVote(governorAddress, proposal.governorProposalId, support));
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {KIND_LABEL[proposal.kind]} #{proposal.refId}
          </CardTitle>
          <Badge variant={active ? "warning" : "secondary"}>
            {active ? "En votación" : proposal.status === "AwaitingArbiter" ? "Esperando árbitro" : "Resuelta"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Row label="A favor" value={formatWei(proposal.votesFor)} />
        <Row label="En contra" value={formatWei(proposal.votesAgainst)} />
        <Row label="Quórum" value={`${proposal.quorumBps / 100}%${proposal.quorumReached ? " ✓" : ""}`} />
        <Row label="Umbral" value={`${proposal.approvalThresholdBps / 100}%`} />
        {active && <Row label="Tiempo restante" value={timeRemaining(proposal.deadline)} />}
        {proposal.result !== "None" && (
          <Row label="Resultado" value={proposal.result === "Approved" ? "Aprobada" : "Rechazada"} />
        )}
        {power.data && (
          <Row
            label="Tu poder de voto"
            value={`${formatWei(power.data.votingPower)}${power.data.hasVoted ? " (ya votaste)" : ""}`}
          />
        )}

        {active && address && isOnSepolia && !power.data?.hasVoted && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" disabled={busy} onClick={() => vote(true)}>
              A favor
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => vote(false)}>
              En contra
            </Button>
          </div>
        )}
        <TxFeedback phase={phase} error={error} />
      </CardContent>
    </Card>
  );
}
