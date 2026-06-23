import { z } from "zod";
import { api } from "@/lib/api";
import { saleOfferResponseSchema, type SaleOfferResponse } from "@shared/schemas/sale.schema";

export async function listOffers(address: string): Promise<SaleOfferResponse[]> {
  const { data } = await api.get(`/projects/${address}/offers`);
  return z.array(saleOfferResponseSchema).parse(data);
}
