import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/providers/WalletProvider";
import { formatWei, formatDate, sameAddress, shortAddress } from "@/lib/format";
import type { ProjectDetailResponse } from "@shared/schemas/project.schema";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function FundingSummary({ project }: { project: ProjectDetailResponse }) {
  const { address } = useWallet();
  const isArbiter = sameAddress(project.currentArbiter, address);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Fondeo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {isArbiter && (
          <Badge variant="warning" className="mb-1">
            Sos el árbitro de este proyecto
          </Badge>
        )}
        <Row label="Recaudado" value={formatWei(project.totalRaised)} />
        <Row label="Objetivo (FF)" value={formatWei(project.ff)} />
        <Row label="Mínimo para arrancar (FMPA)" value={formatWei(project.fmpa)} />
        <Row label="Liberado al desarrollador" value={formatWei(project.totalReleasedToDeveloper)} />
        <Row label="Vencimiento de fondeo" value={formatDate(project.fundingDeadline)} />
        {project.projectType === "Investment" && (
          <Row label="Precio estimado de venta" value={formatWei(project.estimatedSalePrice)} />
        )}
        {project.salePrice && <Row label="Precio de venta" value={formatWei(project.salePrice)} />}
        <Row
          label="Árbitro"
          value={project.currentArbiter ? shortAddress(project.currentArbiter) : "Sin elegir"}
        />
      </CardContent>
    </Card>
  );
}
