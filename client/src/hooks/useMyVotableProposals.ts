import { useQuery } from "@tanstack/react-query";
import { listMyProposals } from "@/services/proposals.service";
import { useWallet } from "@/providers/WalletProvider";

// Feed de propuestas de los proyectos donde la wallet conectada es inversora. Hace polling
// para enterarse en vivo de votaciones nuevas y de su resolucion (aprobado/rechazado).
export function useMyProposalsFeed() {
  const { address } = useWallet();
  return useQuery({
    queryKey: ["my-proposals-feed", address],
    queryFn: () => listMyProposals(address as string),
    enabled: !!address,
    refetchInterval: 4000,
  });
}
