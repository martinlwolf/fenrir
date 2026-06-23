// Servicio de lectura del inversor: historial de inversion. (Lo reclamable se agrega
// en el servicio de venta/reparto, US5.)
import type { InvestmentResponse } from "@shared/schemas/project.schema";
import { InvestmentRepository, investmentRepository } from "../persistence/repositories/investment.repository";

export class InvestorService {
  constructor(private readonly investments: InvestmentRepository = investmentRepository) { }

  async listInvestments(wallet: string): Promise<InvestmentResponse[]> {
    const investments = await this.investments.listByInvestor(wallet);
    return investments.map((i) => i.toResponse());
  }
}

export const investorService = new InvestorService();
