import { api } from "@/lib/api";
import {
  distributionResponseSchema,
  type DistributionResponse,
} from "@shared/schemas/sale.schema";

export async function getDistribution(address: string): Promise<DistributionResponse> {
  const { data } = await api.get(`/projects/${address}/distribution`);
  return distributionResponseSchema.parse(data);
}
