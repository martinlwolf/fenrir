// Objeto de negocio Oferta de venta (espejo). Solo aplica a Fenrir Inversion.
import type { OfferStatusValue } from "@shared/constants/enums";
import type { SaleOfferResponse } from "@shared/schemas/sale.schema";

export interface SaleOfferProps {
  offerId: number;
  buyerWallet: string;
  amount: bigint;
  proposalId: number | null;
  status: OfferStatusValue;
}

export class SaleOffer {
  constructor(private readonly props: SaleOfferProps) {}

  toResponse(): SaleOfferResponse {
    const p = this.props;
    return {
      offerId: p.offerId,
      buyerWallet: p.buyerWallet,
      amount: p.amount.toString(),
      proposalId: p.proposalId,
      status: p.status,
    };
  }
}
