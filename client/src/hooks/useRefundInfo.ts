import { useQuery } from "@tanstack/react-query";
import { getRefundInfo } from "@/lib/chain/contracts";

// Reembolso reclamable leido DIRECTO de on-chain (no del backend espejo), para que el inversor
// pueda recuperar su parte de un proyecto cancelado aunque el ingestion esté atrasado.
export function useRefundInfo(projectAddress: string | undefined, wallet: string | null) {
  return useQuery({
    queryKey: ["refund-info", projectAddress, wallet],
    queryFn: () => getRefundInfo(projectAddress as string, wallet as string),
    enabled: !!projectAddress && !!wallet,
    refetchInterval: 5000,
  });
}
