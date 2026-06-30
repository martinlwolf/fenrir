import { api } from "@/lib/api";
import {
  developerListResponseSchema,
  developerResponseSchema,
  reputationResponseSchema,
  type DeveloperFilter,
  type DeveloperListResponse,
  type DeveloperResponse,
  type DeveloperSort,
  type ReputationResponse,
} from "@shared/schemas/developer.schema";

export interface DeveloperListFilters {
  sort?: DeveloperSort;
  order?: "asc" | "desc";
  filter?: DeveloperFilter;
  page?: number;
  pageSize?: number;
}

// Directorio de developers, ordenable/filtrable por su historico (completados/fallidos).
export async function listDevelopers(
  filters: DeveloperListFilters = {},
): Promise<DeveloperListResponse> {
  const { data } = await api.get("/developers", { params: filters });
  return developerListResponseSchema.parse(data);
}

export async function getDeveloper(wallet: string): Promise<DeveloperResponse> {
  const { data } = await api.get(`/developers/${wallet}`);
  return developerResponseSchema.parse(data);
}

export async function getReputation(wallet: string): Promise<ReputationResponse> {
  const { data } = await api.get(`/developers/${wallet}/reputation`);
  return reputationResponseSchema.parse(data);
}

// Sube material de verificacion de identidad (off-chain, autenticado por firma).
export async function submitVerification(wallet: string, files: File[]): Promise<void> {
  const form = new FormData();
  files.forEach((f) => form.append("documents", f));
  await api.post(`/developers/${wallet}/verification`, form);
}
