import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TxFeedback } from "./TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useWrite } from "@/hooks/useWrite";
import { useArbiterElectionState } from "@/hooks/useArbiterElectionState";
import { openArbiterElection } from "@/lib/chain/contracts";

// Apenas se alcanza el FMPA, la elección de árbitro NO se abre sola: se abre en una tx aparte
// (bloque posterior) para que el snapshot de voto incluya a todos los inversores, incluido el
// que cruzó el FMPA (si se abriera en el mismo bloque, ese inversor tendría 0 poder de voto).
// Lee el estado on-chain, así aparece aunque el backend esté atrasado. Cualquiera puede abrirla.
export function OpenArbiterElectionPanel({ projectAddress }: { projectAddress: string }) {
  const { address, isOnSepolia, connect, switchNetwork, hasWallet } = useWallet();
  const { data: needsOpening } = useArbiterElectionState(projectAddress);
  const { phase, error, run } = useWrite([
    ["arbiter-election-state", projectAddress],
    ["proposals", projectAddress],
    ["project", projectAddress],
  ]);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";

  if (!needsOpening) return null;

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Elección de árbitro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          El proyecto alcanzó el FMPA. Hay que abrir la votación para elegir al árbitro entre los
          inversores. Se abre en una transacción aparte para que todos los inversores —incluido el
          último que aportó— tengan poder de voto.
        </p>
        {!hasWallet ? (
          <p className="text-xs text-muted-foreground">Necesitás una wallet para abrir la elección.</p>
        ) : !address ? (
          <Button size="sm" onClick={() => void connect()}>
            Conectar wallet
          </Button>
        ) : !isOnSepolia ? (
          <Button size="sm" variant="destructive" onClick={() => void switchNetwork()}>
            Cambiar a Sepolia
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void run(() => openArbiterElection(projectAddress))}
          >
            {busy ? "Procesando…" : "Abrir elección de árbitro"}
          </Button>
        )}
        <TxFeedback phase={phase} error={error} />
      </CardContent>
    </Card>
  );
}
