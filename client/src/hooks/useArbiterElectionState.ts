import { useQuery } from "@tanstack/react-query";
import { arbiterElectionNeedsOpening } from "@/lib/chain/contracts";

// ¿La elección de árbitro está pendiente de abrirse? Se lee DIRECTO de on-chain (no del backend
// espejo) y se sondea, para mostrar el botón "Abrir elección" apenas se alcanza el FMPA.
export function useArbiterElectionState(projectAddress: string | undefined) {
  return useQuery({
    queryKey: ["arbiter-election-state", projectAddress],
    queryFn: () => arbiterElectionNeedsOpening(projectAddress as string),
    enabled: !!projectAddress,
    refetchInterval: 4000,
  });
}
