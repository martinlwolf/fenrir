import { useQuery } from "@tanstack/react-query";
import { getArbiter } from "@/services/proposals.service";

// Arbitro actual del proyecto + si hay una eleccion en curso. Habilita la conciencia de rol
// "soy el arbitro" y el panel de desempate (arbiterDecide).
export function useArbiter(address: string | undefined) {
  return useQuery({
    queryKey: ["arbiter", address],
    queryFn: () => getArbiter(address as string),
    enabled: !!address,
  });
}
