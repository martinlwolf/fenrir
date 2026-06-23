import { z } from "zod";
import { api } from "@/lib/api";
import {
  investmentResponseSchema,
  type InvestmentResponse,
} from "@shared/schemas/project.schema";
import {
  claimableResponseSchema,
  type ClaimableResponse,
} from "@shared/schemas/sale.schema";

export async function getInvestments(wallet: string): Promise<InvestmentResponse[]> {
  const { data } = await api.get(`/investors/${wallet}/investments`);
  return z.array(investmentResponseSchema).parse(data);
}

export async function getClaimable(wallet: string): Promise<ClaimableResponse> {
  const { data } = await api.get(`/investors/${wallet}/claimable`);
  return claimableResponseSchema.parse(data);
}
