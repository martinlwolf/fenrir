import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { MilestoneStatusBadge } from "./StatusBadge";
import { ReportVerificationBadge } from "./ReportVerificationBadge";
import { DeclareMilestoneDialog } from "./DeclareMilestoneDialog";
import { useWallet } from "@/providers/WalletProvider";
import { formatWei, formatDate } from "@/lib/format";
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
}: {
  milestone: MilestoneResponse;
  projectAddress: string;
  canDeclare: boolean;
}) {
  const reportId = reportIdFromUrl(milestone.reportUrl);
  const declarable =
    canDeclare && (milestone.status === "Pending" || milestone.status === "Rejected");
  return (
    <div className="flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">Hito {milestone.milestoneIndex}</span>
          <MilestoneStatusBadge status={milestone.status} />
          {milestone.retryCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {milestone.retryCount} reintento(s)
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          Tranche: {formatWei(milestone.budget)} · Vence: {formatDate(milestone.deadline)}
          {milestone.trancheReleased && " · liberada"}
        </div>
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
}: {
  milestones: MilestoneResponse[];
  projectAddress: string;
  developerWallet: string;
}) {
  const { address } = useWallet();
  const canDeclare = !!address && address === developerWallet;
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
            <MilestoneItem
              key={m.milestoneIndex}
              milestone={m}
              projectAddress={projectAddress}
              canDeclare={canDeclare}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
