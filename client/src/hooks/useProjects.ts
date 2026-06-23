import { useQuery } from "@tanstack/react-query";
import {
  listBuyerProjects,
  listProjects,
  type ProjectFilters,
} from "@/services/projects.service";

export function useProjects(filters: ProjectFilters, buyerView = false) {
  return useQuery({
    queryKey: ["projects", { ...filters, buyerView }],
    queryFn: () => (buyerView ? listBuyerProjects(filters) : listProjects(filters)),
  });
}
