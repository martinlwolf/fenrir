import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TxFeedback } from "./TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useWrite } from "@/hooks/useWrite";
import { claimCommission } from "@/lib/chain/contracts";
import type { ProjectDetailResponse } from "@shared/schemas/project.schema";

// Reclamo de comisión del developer (proyecto Completed). La API todavía no expone el monto
// reclamable de comisión (CLAIM_TYPE solo tiene Refund/Distribution), así que mostramos el
// botón y dejamos que el contrato valide el monto y el estado (descuenta penalización, etc.).
// TODO(backend): exponer `claimableCommission` (p.ej. en GET /projects/:address/distribution
// o un endpoint de claimable de comisión) para poder mostrar el monto y ocultar el botón si
// ya se reclamó o es 0.
export function ClaimCommissionPanel({ project }: { project: ProjectDetailResponse }) {
  const { address, isOnSepolia } = useWallet();
  const { phase, error, run } = useWrite([["project", project.address]]);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";

  // El backend decide si el viewer es el developer y si puede reclamar. El front no reimplementa
  // la regla: solo oculta el panel a no-developers y habilita/deshabilita el boton segun la capability.
  const claim = project.viewer.capabilities.claimCommission;
  if (!project.viewer.isDeveloper) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Comisión del desarrollador</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {claim.allowed
            ? "El proyecto está completado. Podés reclamar tu comisión (el contrato calcula el monto neto de penalizaciones)."
            : (claim.reason ?? "Todavía no podés reclamar la comisión.")}
        </p>
        {address && isOnSepolia && (
          <Button
            size="sm"
            disabled={busy || !claim.allowed}
            onClick={() => void run(() => claimCommission(project.address))}
          >
            {busy ? "Procesando…" : "Reclamar comisión"}
          </Button>
        )}
        <TxFeedback phase={phase} error={error} />
      </CardContent>
    </Card>
  );
}
