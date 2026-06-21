// Objeto de negocio Inversion (espejo del evento Invested).
import type { InvestmentResponse } from "@shared/schemas/project.schema";

export interface InvestmentProps {
  projectAddress: string;
  investorWallet: string;
  amount: bigint;
  txHash: string;
  block: bigint;
}

export class Investment {
  constructor(private readonly props: InvestmentProps) {}

  toResponse(): InvestmentResponse {
    const p = this.props;
    return {
      projectAddress: p.projectAddress,
      investorWallet: p.investorWallet,
      amount: p.amount.toString(),
      txHash: p.txHash,
      block: p.block.toString(),
    };
  }
}
