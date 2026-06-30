import { useQuery } from "@tanstack/react-query";
import { getMilestoneReport } from "@/services/reports.service";

// Reporte de un hito por (proyecto, indice). retry: false porque un hito sin reporte
// devuelve 404 y no tiene sentido reintentar. Solo se habilita cuando se sabe que el hito
// tiene reporte (reportHash on-chain presente), para no disparar 404 innecesarios.
export function useMilestoneReport(
  address: string | undefined,
  milestoneIndex: number | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ["milestone-report", address, milestoneIndex],
    queryFn: () => getMilestoneReport(address as string, milestoneIndex as number),
    enabled: enabled && !!address && milestoneIndex != null,
    retry: false,
  });
}
