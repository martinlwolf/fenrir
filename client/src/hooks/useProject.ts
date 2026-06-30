import { useQuery } from "@tanstack/react-query";
import { getProject } from "@/services/projects.service";

// Estados terminales: ya no cambian, no tiene sentido seguir sondeando.
const TERMINAL_STATUSES = ["Completed", "Cancelled"];

export function useProject(address: string | undefined) {
  return useQuery({
    queryKey: ["project", address],
    queryFn: () => getProject(address as string),
    enabled: !!address,
    // Sondeo cada 2s para reflejar cambios rápidos (inversión, FMPA/FF, hitos, ventas) sin
    // recargar. Se corta cuando el proyecto llega a un estado terminal (igual criterio que
    // useProposals/useOffers: no pollear cuando no hay nada que pueda cambiar).
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL_STATUSES.includes(status) ? false : 2000;
    },
  });
}
