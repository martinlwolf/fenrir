// Funciones puras de derivacion de estado y capabilities para la etapa de venta (US5).
// Centralizan la logica que antes vivia en SaleSection.tsx y OfferRow.tsx: el backend
// decide, el frontend solo pinta. NO consultan repos ni deciden nada on-chain (FR-020).
import type { OfferStatusValue, ProjectStatusValue } from "@shared/constants/enums";
import type { Capability, Display } from "@shared/schemas/common.schema";
import type { ViewerContext } from "./Viewer";
import { offerDisplay } from "./display";

// Campos derivados del viewer frente a una oferta de venta. Reemplaza la logica de
// OfferRow.tsx:38 (votable) y SaleSection.tsx:160-161 (funcion de voto a usar).
export function offerViewerFields(
  offer: { status: OfferStatusValue; proposalId: number | null },
  viewer: ViewerContext,
): { votable: boolean; display: Display; viewer: { usesDeveloperVote: boolean } } {
  return {
    // La oferta admite voto solo si esta en Voting y tiene proposalId asociado.
    votable: offer.status === "Voting" && offer.proposalId != null,
    // Etiqueta lista para renderizar: el frontend solo mapea variant a color/icono.
    display: offerDisplay(offer.status),
    viewer: {
      // El developer vota con castDeveloperSaleVote; los inversores con castVote.
      // El front usa este flag para elegir la funcion sin conocer el rol directamente.
      usesDeveloperVote: viewer.isDeveloper,
    },
  };
}

// Capabilities de venta a nivel proyecto. Replica la logica de SaleSection.tsx:38-41.
export function saleCapabilities(
  projectStatus: ProjectStatusValue,
  hasApprovedOffer: boolean,
): { canExecuteSale: Capability } {
  if (projectStatus !== "Selling") {
    return { canExecuteSale: { allowed: false, reason: "El proyecto no está en etapa de venta" } };
  }
  if (!hasApprovedOffer) {
    return { canExecuteSale: { allowed: false, reason: "No hay ninguna oferta aprobada para ejecutar" } };
  }
  return { canExecuteSale: { allowed: true } };
}
