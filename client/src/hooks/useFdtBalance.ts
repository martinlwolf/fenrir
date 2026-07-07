import { useQuery } from "@tanstack/react-query";
import { getFdtBalance } from "@/lib/chain/contracts";

// Balance de FDT leido directo de la cadena (no del historial de inversiones del backend,
// que nunca baja). Sirve para saber si la wallet todavia tiene participacion real en un
// proyecto despues de transferir FDT o de reclamar un reembolso.
export function useFdtBalance(tokenAddress: string | undefined, wallet: string | null) {
  return useQuery({
    queryKey: ["fdt-balance", tokenAddress, wallet],
    queryFn: () => getFdtBalance(tokenAddress as string, wallet as string),
    enabled: !!tokenAddress && !!wallet,
  });
}
