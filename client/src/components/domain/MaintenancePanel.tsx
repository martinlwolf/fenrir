import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TxFeedback } from "./TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useWrite } from "@/hooks/useWrite";
import {
  cancelExpiredFunding,
  cancelStalledMilestone,
  pokeFundingGates,
} from "@/lib/chain/contracts";
import { isPast } from "@/lib/format";
import type { ProjectDetailResponse } from "@shared/schemas/project.schema";

// Acciones de mantenimiento / casos borde que destraban un proyecto. El contrato valida cada
// precondición (estado, rol, deadline, balance); la UI solo ofrece el control en el contexto
// plausible para no confundir.
export function MaintenancePanel({ project }: { project: ProjectDetailResponse }) {
  const { address, isOnSepolia } = useWallet();
  const { phase, error, run } = useWrite([
    ["project", project.address],
    ["proposals", project.address],
  ]);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";

  // Fondeo vencido sin alcanzar el FMPA: se puede cancelar para habilitar el reembolso 100%.
  const fundingExpired =
    project.status === "Funding" &&
    isPast(project.fundingDeadline) &&
    safeLt(project.totalRaised, project.fmpa);

  const building = project.status === "Building";

  const showCard = fundingExpired || building;
  if (!showCard) return null;

  const ready = !!address && isOnSepolia;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Mantenimiento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fundingExpired && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              El fondeo venció sin alcanzar el mínimo (FMPA). Se puede cancelar el proyecto para
              habilitar el reembolso total.
            </p>
            {ready && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void run(() => cancelExpiredFunding(project.address))}
              >
                Cancelar fondeo vencido
              </Button>
            )}
          </div>
        )}

        {building && (
          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Si un hito quedó estancado (deadline vencido o sin fondos), un inversor puede
                cancelar el proyecto.
              </p>
              {ready && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(() => cancelStalledMilestone(project.address))}
                >
                  Cancelar hito estancado
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Destrabar la liberación de tranches pendientes o la apertura de votación.
              </p>
              {ready && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(() => pokeFundingGates(project.address))}
                >
                  Destrabar tranches
                </Button>
              )}
            </div>
          </div>
        )}

        <TxFeedback phase={phase} error={error} />
      </CardContent>
    </Card>
  );
}

// Comparación de montos en wei (string) sin lógica de negocio: solo decide si mostrar un
// control que de todos modos el contrato vuelve a validar.
function safeLt(a: string, b: string): boolean {
  try {
    return BigInt(a) < BigInt(b);
  } catch {
    return false;
  }
}
