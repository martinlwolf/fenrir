import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldX, ShieldQuestion } from "lucide-react";
import { useReportVerification } from "@/hooks/useReportVerification";

// Muestra el resultado de verificacion de hash que entrega la API (hashMatch). El frontend
// NO recalcula la huella (FR-009).
export function ReportVerificationBadge({ reportId }: { reportId: number }) {
  const { data, isLoading } = useReportVerification(reportId);
  if (isLoading || !data) return null;

  if (data.hashMatch === true) {
    return (
      <Badge variant="success" className="gap-1">
        <ShieldCheck className="size-3" /> Hash verificado
      </Badge>
    );
  }
  if (data.hashMatch === false) {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldX className="size-3" /> Hash no coincide
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <ShieldQuestion className="size-3" /> Sin verificar on-chain
    </Badge>
  );
}
