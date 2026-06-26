import { useQuery } from "@tanstack/react-query";
import { listOffers } from "@/services/offers.service";
import { getDistribution } from "@/services/distribution.service";

// Ofertas con polling mientras alguna este en votacion (FR-023).
export function useOffers(address: string | undefined) {
  return useQuery({
    queryKey: ["offers", address],
    queryFn: () => listOffers(address as string),
    enabled: !!address,
    refetchInterval: (query) =>
      query.state.data?.some((o) => o.status === "Voting") ? 4000 : false,
  });
}

export function useDistribution(address: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["distribution", address],
    queryFn: () => getDistribution(address as string),
    enabled: !!address && enabled,
  });
}
