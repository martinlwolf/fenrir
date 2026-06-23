import { useQuery } from "@tanstack/react-query";
import { getClaimable, getInvestments } from "@/services/investors.service";

export function useInvestments(wallet: string | null) {
  return useQuery({
    queryKey: ["investments", wallet],
    queryFn: () => getInvestments(wallet as string),
    enabled: !!wallet,
  });
}

export function useClaimable(wallet: string | null) {
  return useQuery({
    queryKey: ["claimable", wallet],
    queryFn: () => getClaimable(wallet as string),
    enabled: !!wallet,
  });
}
