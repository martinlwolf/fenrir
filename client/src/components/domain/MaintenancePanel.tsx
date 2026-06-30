import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TxFeedback } from "./TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useWrite } from "@/hooks/useWrite";
import { useInvestments } from "@/hooks/useInvestments";
import {
  cancelExpiredFunding,
  cancelStalledMilestone,
  pokeFundingGates,
} from "@/lib/chain/contracts";
import { isPast, sameAddress } from "@/lib/format";
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

  // ¿La wallet conectada es inversora del proyecto? Solo un inversor (FDT > 0) puede cancelar
  // un hito estancado on-chain; el developer no invierte en su propio proyecto, así que no
  // le ofrecemos un botón que el contrato le rechazaría.
  const investments = useInvestments(address);
  const isInvestor =
    !!address &&
    (investments.data ?? []).some((inv) => sameAddress(inv.projectAddress, project.address));

  // Fondeo vencido sin alcanzar el FMPA: se puede cancelar para habilitar el reembolso 100%.
  const fundingExpired =
    project.status === "Funding" &&
    isPast(project.fundingDeadline) &&
    safeLt(project.totalRaised, project.fmpa);

  const building = project.status === "Building";

  // Hito vigente estancado (espeja cancelStalledMilestone on-chain): o el hito venció en su
  // ventana (Pending + deadline pasado), o quedó declarado sin los fondos para abrir votación.
  const current = project.milestones.find((m) => m.milestoneIndex === project.currentMilestoneIndex);
  const cumulativeBudget = project.milestones
    .filter((m) => m.milestoneIndex <= project.currentMilestoneIndex)
    .reduce((sum, m) => sum + safeBig(m.budget), 0n);
  const deadlineMissed = building && current?.status === "Pending" && isPast(current.deadline);
  const stalledForFunds =
    building && current?.status === "Declared" && safeBig(project.totalRaised) < cumulativeBudget;
  const stalled = !!(deadlineMissed || stalledForFunds);

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
            {stalled && (
              <div className="space-y-1 rounded-md bg-amber-50 px-2 py-1.5 dark:bg-amber-950/40">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  El proyecto está <strong>estancado</strong>:{" "}
                  {deadlineMissed
                    ? "el hito vigente venció sin que el desarrollador lo (re)declarara a tiempo"
                    : "el hito quedó declarado pero no se juntaron los fondos para abrir su votación"}
                  . Cualquier inversor puede cancelarlo para habilitar el reembolso proporcional de
                  las tranches no aprobadas.
                </p>
                {ready && isInvestor ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void run(() => cancelStalledMilestone(project.address))}
                  >
                    Cancelar proyecto estancado
                  </Button>
                ) : (
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                    Solo un inversor del proyecto (que tenga FDT) puede ejecutar la cancelación.
                  </p>
                )}
              </div>
            )}
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

function safeBig(x: string): bigint {
  try {
    return BigInt(x);
  } catch {
    return 0n;
  }
}
