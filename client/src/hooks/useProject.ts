import { useQuery } from "@tanstack/react-query";
import { getProject } from "@/services/projects.service";

export function useProject(address: string | undefined) {
  return useQuery({
    queryKey: ["project", address],
    queryFn: () => getProject(address as string),
    enabled: !!address,
  });
}
