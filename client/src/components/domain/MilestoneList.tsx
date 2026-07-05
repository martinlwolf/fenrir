import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { MilestoneStatusBadge } from "./StatusBadge";
import { ReportVerificationBadge } from "./ReportVerificationBadge";
import { DeclareMilestoneDialog } from "./DeclareMilestoneDialog";
import { formatWei, formatDate, formatDuration } from "@/lib/format";
import type { MilestoneResponse } from "@shared/schemas/project.schema";

function MilestoneItem({
  milestone,
  projectAddress,
}: {
  milestone: MilestoneResponse;
  projectAddress: string;
}) {
  // La prueba de cumplimiento existe si el developer ya declaro el hito on-chain
  // (reportHash presente). El link va a la pagina de reporte del frontend, no a la
  // reportUrl on-chain, asi funciona igual para declaraciones viejas y nuevas.
  const hasReport = milestone.reportHash != null;
  // El backend ya combina estructura (hitos secuenciales, estado) + rol developer del viewer.
  const declarable = milestone.viewer.canDeclare.allowed;
  // Tras un rechazo el hito vuelve a Pending pero con una ventana de reintento de SOLO 2 min
  // (RETRY_WINDOW on-chain), mucho mas corta que la duracion original del hito. Es presentacion
  // del texto; `retryExpired` (si ese plazo ya paso) viene del DTO, no se recalcula.
  const isRetryWindow = milestone.status === "Pending" && milestone.retryCount > 0;
  return (
    <div className="flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">Hito {milestone.milestoneIndex + 1}</span>
          <MilestoneStatusBadge
            status={milestone.status}
            display={milestone.display}
            votingExpired={milestone.votingExpired}
            pausedForFunds={milestone.pausedForFunds}
            retryExpired={milestone.retryExpired}
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
        {isRetryWindow && !milestone.retryExpired && (
          <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Este hito fue rechazado. El desarrollador tiene una <strong>ventana corta de 2
            minutos</strong> para volver a declararlo (no la duración original del hito). Si no
            redeclara a tiempo, el proyecto se cancela.
          </p>
        )}
        {milestone.retryExpired && (
          <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
            La ventana de reintento (2 min) <strong>venció sin redeclaración</strong>: ya no se
            puede volver a declarar este hito (<code>declareMilestone</code> revierte con
            «deadline passed»). El proyecto quedó en condiciones de ser cancelado, con reembolso
            proporcional de las tranches no aprobadas.
          </p>
        )}
        {milestone.pausedForFunds && (
          <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            El desarrollador ya declaró este hito, pero la votación <strong>no se abre</strong>{" "}
            porque todavía no se juntaron los fondos para financiarlo: faltan{" "}
            <strong>{formatWei(milestone.fundsShortfall)}</strong>. Queda pausado hasta que entre
            más inversión (la ronda sigue abierta hasta el FF) o los inversores cancelen el proyecto.
          </p>
        )}
        {hasReport && (
          <ReportVerificationBadge address={projectAddress} index={milestone.milestoneIndex} />
        )}
      </div>
      <div className="flex items-center gap-2">
        {declarable && (
          <DeclareMilestoneDialog
            projectAddress={projectAddress}
            milestoneIndex={milestone.milestoneIndex}
          />
        )}
        {hasReport && (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/projects/${projectAddress}/milestones/${milestone.milestoneIndex}/report`}>
              <FileText /> Reporte
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function MilestoneList({
  milestones,
  projectAddress,
}: {
  milestones: MilestoneResponse[];
  projectAddress: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Hitos</CardTitle>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Sin hitos para mostrar.</p>
        ) : (
          milestones.map((m) => (
            <MilestoneItem key={m.milestoneIndex} milestone={m} projectAddress={projectAddress} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
