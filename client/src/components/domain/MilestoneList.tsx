import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { MilestoneStatusBadge } from "./StatusBadge";
import { ReportVerificationBadge } from "./ReportVerificationBadge";
import { DeclareMilestoneDialog } from "./DeclareMilestoneDialog";
import { useWallet } from "@/providers/WalletProvider";
import { useProposals } from "@/hooks/useProposals";
import { formatWei, formatDate, formatDuration, isPast } from "@/lib/format";
import type { MilestoneResponse } from "@shared/schemas/project.schema";

function reportIdFromUrl(url: string | null): number | null {
  if (!url) return null;
  const match = url.match(/\/reports\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function MilestoneItem({
  milestone,
  projectAddress,
  canDeclare,
  prevResolved,
  votingExpired,
  pausedForFunds,
  fundsShortfall,
}: {
  milestone: MilestoneResponse;
  projectAddress: string;
  canDeclare: boolean;
  /** Todos los hitos anteriores ya estan aprobados: recien ahi se puede declarar este (hitos secuenciales). */
  prevResolved: boolean;
  /** El plazo de votacion del hito ya vencio pero la propuesta sigue Active (sin resolver). */
  votingExpired: boolean;
  /** Declarado pero la votacion no abrio porque todavia no se juntaron los fondos del hito. */
  pausedForFunds: boolean;
  /** Cuanto falta recaudar (wei) para que se pueda abrir la votacion de este hito. */
  fundsShortfall: bigint;
}) {
  const reportId = reportIdFromUrl(milestone.reportUrl);
  const declarable =
    canDeclare &&
    prevResolved &&
    (milestone.status === "Pending" || milestone.status === "Rejected");
  // Tras un rechazo el hito vuelve a Pending pero con una ventana de reintento de SOLO 2 min
  // (RETRY_WINDOW on-chain), mucho mas corta que la duracion original del hito. Si ese plazo
  // pasa, declareMilestone revierte con "deadline passed" y el proyecto queda cancelable.
  const isRetryWindow = milestone.status === "Pending" && milestone.retryCount > 0;
  const retryExpired = isRetryWindow && isPast(milestone.deadline);
  return (
    <div className="flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">Hito {milestone.milestoneIndex + 1}</span>
          <MilestoneStatusBadge
            status={milestone.status}
            expired={votingExpired}
            pausedForFunds={pausedForFunds}
            retryExpired={retryExpired}
          />
          {milestone.retryCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {milestone.retryCount} reintento(s)
            </span>
          )}
        </div>
        {milestone.description && (
          <p className="whitespace-pre-wrap break-words text-sm">
            <span className="text-muted-foreground">Promesa: </span>
            {milestone.description}
          </p>
        )}
        <div className="text-sm text-muted-foreground">
          Tranche: {formatWei(milestone.budget)} ·{" "}
          {isRetryWindow
            ? `Reintento: redeclarar antes de ${formatDate(milestone.deadline)} (ventana de 2 min)`
            : milestone.deadline
              ? `Vence: ${formatDate(milestone.deadline)}`
              : `Plazo: ${formatDuration(milestone.durationSeconds)} (desde su activación)`}
          {milestone.trancheReleased && " · liberada"}
        </div>
        {isRetryWindow && !retryExpired && (
          <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Este hito fue rechazado. El desarrollador tiene una <strong>ventana corta de 2
            minutos</strong> para volver a declararlo (no la duración original del hito). Si no
            redeclara a tiempo, el proyecto se cancela.
          </p>
        )}
        {retryExpired && (
          <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
            La ventana de reintento (2 min) <strong>venció sin redeclaración</strong>: ya no se
            puede volver a declarar este hito (<code>declareMilestone</code> revierte con
            «deadline passed»). El proyecto quedó en condiciones de ser cancelado, con reembolso
            proporcional de las tranches no aprobadas.
          </p>
        )}
        {pausedForFunds && (
          <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            El desarrollador ya declaró este hito, pero la votación <strong>no se abre</strong>{" "}
            porque todavía no se juntaron los fondos para financiarlo: faltan{" "}
            <strong>{formatWei(fundsShortfall.toString())}</strong>. Queda pausado hasta que entre
            más inversión (la ronda sigue abierta hasta el FF) o los inversores cancelen el proyecto.
          </p>
        )}
        {reportId != null && <ReportVerificationBadge reportId={reportId} />}
      </div>
      <div className="flex items-center gap-2">
        {declarable && (
          <DeclareMilestoneDialog
            projectAddress={projectAddress}
            milestoneIndex={milestone.milestoneIndex}
          />
        )}
        {milestone.reportUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={milestone.reportUrl} target="_blank" rel="noreferrer">
              <ExternalLink /> Reporte
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

export function MilestoneList({
  milestones,
  projectAddress,
  developerWallet,
  obraStarted,
  totalRaised,
}: {
  milestones: MilestoneResponse[];
  projectAddress: string;
  developerWallet: string;
  /** El proyecto ya arranco obra (Building + arbitro electo): recien ahi el contrato
   *  acepta declareMilestone (FenrirProject.sol). Antes el proyecto sigue en Funding. */
  obraStarted: boolean;
  /** Total recaudado del proyecto (wei). Se usa para detectar el hito declarado pero pausado
   *  por falta de fondos: el contrato abre la votacion solo si totalRaised >= presupuesto
   *  acumulado hasta ese hito (_fundsAvailableFor en FenrirProject.sol). */
  totalRaised: string;
}) {
  const { address } = useWallet();
  const canDeclare = obraStarted && !!address && address === developerWallet;

  // Deadline de votacion por propuesta, para marcar "Votación vencida" cuando el plazo paso
  // pero la propuesta sigue Active (aun no se llamo resolve() on-chain).
  const { data: proposals } = useProposals(projectAddress);
  const deadlineByProposalId = new Map(
    (proposals ?? []).map((p) => [p.governorProposalId, p.deadline]),
  );

  const raisedWei = BigInt(totalRaised);
  // Presupuesto acumulado hasta cada hito (espeja _cumulativeBudget on-chain), independiente
  // del orden del array: suma los budgets de los hitos con indice <= al de cada uno.
  const cumulativeBudgetUpTo = (index: number): bigint =>
    milestones
      .filter((p) => p.milestoneIndex <= index)
      .reduce((sum, p) => sum + BigInt(p.budget), 0n);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Hitos</CardTitle>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Sin hitos para mostrar.</p>
        ) : (
          milestones.map((m, i) => {
            // Un hito en estado "Declared" (no "Voting") significa que _tryOpenVoting no pudo
            // abrir la votacion: la unica causa es que falten fondos para financiarlo.
            const required = cumulativeBudgetUpTo(m.milestoneIndex);
            const pausedForFunds = m.status === "Declared" && raisedWei < required;
            return (
              <MilestoneItem
                key={m.milestoneIndex}
                milestone={m}
                projectAddress={projectAddress}
                canDeclare={canDeclare}
                // Hitos secuenciales: este solo es declarable si todos los anteriores estan aprobados.
                prevResolved={milestones.slice(0, i).every((p) => p.status === "Approved")}
                votingExpired={
                  m.status === "Voting" &&
                  m.proposalId != null &&
                  isPast(deadlineByProposalId.get(m.proposalId))
                }
                pausedForFunds={pausedForFunds}
                fundsShortfall={pausedForFunds ? required - raisedWei : 0n}
              />
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
