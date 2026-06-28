import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TxFeedback } from "./TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useWrite } from "@/hooks/useWrite";
import { castElectionVote, resolve } from "@/lib/chain/contracts";
import { isPast, timeRemaining } from "@/lib/format";
import type { ProposalResponse } from "@shared/schemas/proposal.schema";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

// Eleccion de arbitro (hito 0). El candidato es un inversor del proyecto; se vota su
// direccion (castElectionVote). El backend no expone la lista de candidatos en el contrato
// de datos, asi que se ingresa/pega la direccion del candidato.
export function ArbiterElectionPanel({
  governorAddress,
  projectAddress,
  proposal,
}: {
  governorAddress: string;
  projectAddress: string;
  proposal: ProposalResponse;
}) {
  const { address, isOnSepolia } = useWallet();
  const { phase, error, run } = useWrite([["proposals", projectAddress]]);
  const [candidate, setCandidate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";
  const active = proposal.status === "Active";
  const canResolve = active && isPast(proposal.deadline);

  function vote() {
    setFormError(null);
    if (!ADDRESS_RE.test(candidate)) {
      setFormError("Ingresá una dirección de candidato válida (0x…).");
      return;
    }
    void run(() => castElectionVote(governorAddress, proposal.governorProposalId, candidate));
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Elección de árbitro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {active && (
          <p className="text-sm text-muted-foreground">
            Tiempo restante: {timeRemaining(proposal.deadline)}
          </p>
        )}
        {proposal.electedArbiter && (
          <p className="text-sm">Árbitro electo: {proposal.electedArbiter}</p>
        )}
        {active && address && isOnSepolia && (
          <div className="space-y-2">
            <Label htmlFor="candidate">Dirección del candidato</Label>
            <Input
              id="candidate"
              placeholder="0x…"
              value={candidate}
              onChange={(e) => setCandidate(e.target.value)}
              disabled={busy}
            />
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button size="sm" disabled={busy} onClick={vote}>
              {busy ? "Procesando…" : "Votar candidato"}
            </Button>
          </div>
        )}
        {canResolve && address && isOnSepolia && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void run(() => resolve(governorAddress, proposal.governorProposalId))}
          >
            {busy ? "Procesando…" : "Finalizar elección"}
          </Button>
        )}
        <TxFeedback phase={phase} error={error} />
      </CardContent>
    </Card>
  );
}
