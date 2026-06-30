import { useQuery } from "@tanstack/react-query";
import { getProjectInvestors } from "@/services/projects.service";

// Inversores del proyecto: candidatos validos al rol de arbitro (hito 0). Pobla el
// selector de candidato en la eleccion de arbitro.
export function useProjectInvestors(address: string | undefined) {
  return useQuery({
    queryKey: ["project-investors", address],
    queryFn: () => getProjectInvestors(address as string),
    enabled: !!address,
  });
}
