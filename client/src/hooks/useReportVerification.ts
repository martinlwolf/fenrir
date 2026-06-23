import { useQuery } from "@tanstack/react-query";
import { getReportVerification } from "@/services/reports.service";

export function useReportVerification(reportId: number | null) {
  return useQuery({
    queryKey: ["report-verification", reportId],
    queryFn: () => getReportVerification(reportId as number),
    enabled: reportId != null,
  });
}
