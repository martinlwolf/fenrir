// Servicio de lectura del inversor: historial de inversion. (Lo reclamable se agrega
// en el servicio de venta/reparto, US5.)
import type { InvestmentResponse } from "@shared/schemas/project.schema";
import * as investmentDao from "../daos/investment.dao";

export async function listInvestments(wallet: string): Promise<InvestmentResponse[]> {
  const investments = await investmentDao.listByInvestor(wallet);
  return investments.map((i) => i.toResponse());
}
