import { useQuery } from "@tanstack/react-query";
import { getVotingPower, listProposals } from "@/services/proposals.service";

// Lista de propuestas con polling mientras alguna este Active (FR-023, D3).
export function useProposals(address: string | undefined) {
  return useQuery({
    queryKey: ["proposals", address],
    queryFn: () => listProposals(address as string),
    enabled: !!address,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasActive = data?.some((p) => p.status === "Active");
      return hasActive ? 4000 : false;
    },
  });
}

export function useVotingPower(
  address: string | undefined,
  proposalId: number | undefined,
  wallet: string | null,
) {
  return useQuery({
    queryKey: ["voting-power", address, proposalId, wallet],
    queryFn: () => getVotingPower(address as string, proposalId as number, wallet as string),
    enabled: !!address && proposalId != null && !!wallet,
  });
}
