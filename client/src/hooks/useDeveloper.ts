import { useQuery } from "@tanstack/react-query";
import { getDeveloper, getReputation } from "@/services/developers.service";

export function useDeveloper(wallet: string | undefined) {
  return useQuery({
    queryKey: ["developer", wallet],
    queryFn: () => getDeveloper(wallet as string),
    enabled: !!wallet,
    retry: false,
  });
}

export function useReputation(wallet: string | undefined) {
  return useQuery({
    queryKey: ["reputation", wallet],
    queryFn: () => getReputation(wallet as string),
    enabled: !!wallet,
  });
}
