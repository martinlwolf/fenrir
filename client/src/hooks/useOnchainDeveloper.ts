import { useQuery } from "@tanstack/react-query";
import { getOnchainDeveloper } from "@/lib/chain/contracts";

// Registro de developer leído DIRECTO del factory on-chain (no del backend espejo). Es lo que
// realmente valida createProject: si redeployás el factory, esta es la única señal confiable de
// si la wallet puede crear proyectos. `poll` sondea mientras se espera la confirmación del alta.
export function useOnchainDeveloper(wallet: string | null, poll = false) {
  return useQuery({
    queryKey: ["onchain-developer", wallet],
    queryFn: () => getOnchainDeveloper(wallet as string),
    enabled: !!wallet,
    refetchInterval: poll ? 3000 : false,
  });
}
