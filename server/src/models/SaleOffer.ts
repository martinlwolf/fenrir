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

// Campos base que el model puede derivar sin conocer el viewer ni la policy de display.
// Los campos display/votable/viewer los agrega el service con offerViewerFields (SalePolicy).
export type SaleOfferBase = Omit<SaleOfferResponse, "display" | "votable" | "viewer">;

export class SaleOffer {
  constructor(private readonly props: SaleOfferProps) {}

  // Devuelve los campos base de la oferta. Los campos derivados del viewer (display,
  // votable, viewer) se suman en SaleService usando offerViewerFields de SalePolicy.
  toResponse(): SaleOfferBase {
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
