import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TxFeedback } from "./TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useWrite } from "@/hooks/useWrite";
import { useProjectInvestors } from "@/hooks/useProjectInvestors";
import { castElectionVote, resolve } from "@/lib/chain/contracts";
import { isPast, shortAddress, timeRemaining } from "@/lib/format";
import type { ProposalResponse } from "@shared/schemas/proposal.schema";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

// Eleccion de arbitro (hito 0). El candidato es un inversor del proyecto; se vota su
// direccion (castElectionVote). Los candidatos validos son los inversores del proyecto
// (business_rules/ciclo-de-hitos.md), que el backend expone en /projects/:address/investors:
// se eligen con un selector y se cae a entrada manual si la lista no esta disponible.
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
  const investors = useProjectInvestors(projectAddress);
  const [candidate, setCandidate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  // El cierre ya confirmo en cadena pero el espejo del backend tarda hasta un ciclo de
  // polling en reflejarlo (D4): ocultamos el boton de inmediato para no mostrarlo junto al
  // "confirmado"; el polling de useProposals termina de actualizar el estado.
  const [justResolved, setJustResolved] = useState(false);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";
  const active = proposal.status === "Active";
  const expired = isPast(proposal.deadline);
  const canResolve = active && expired && !justResolved;
  const candidates = investors.data ?? [];
  const hasCandidates = candidates.length > 0;

  function vote() {
    setFormError(null);
    if (!ADDRESS_RE.test(candidate)) {
      setFormError("Elegí un candidato o ingresá una dirección válida (0x…).");
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
        {active &&
          (expired ? (
            <p className="text-sm font-medium text-destructive">Votación vencida</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tiempo restante: {timeRemaining(proposal.deadline)}
            </p>
          ))}
        {proposal.electedArbiter && (
          <p className="text-sm">Árbitro electo: {proposal.electedArbiter}</p>
        )}
        {active && address && isOnSepolia && (
          <div className="space-y-2">
            <Label htmlFor="candidate">Candidato (inversor del proyecto)</Label>
            {hasCandidates ? (
              <Select value={candidate} onValueChange={setCandidate} disabled={busy}>
                <SelectTrigger id="candidate">
                  <SelectValue placeholder="Elegí un inversor…" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c} value={c}>
                      {shortAddress(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <Input
                  id="candidate"
                  placeholder="0x…"
                  value={candidate}
                  onChange={(e) => setCandidate(e.target.value)}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">
                  {investors.isLoading
                    ? "Cargando inversores…"
                    : "No se pudo cargar la lista de inversores; pegá la dirección del candidato."}
                </p>
              </>
            )}
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button size="sm" disabled={busy || !candidate} onClick={vote}>
              {busy ? "Procesando…" : "Votar candidato"}
            </Button>
          </div>
        )}
        {canResolve && address && isOnSepolia && (
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
            {busy ? "Procesando…" : "Finalizar elección"}
          </Button>
        )}
        {active && expired && justResolved && (
          <p className="text-xs text-muted-foreground">Elección cerrada. Actualizando el estado…</p>
        )}
        <TxFeedback phase={phase} error={error} />
      </CardContent>
    </Card>
  );
}
