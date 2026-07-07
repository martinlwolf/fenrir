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
  // Deadline de la Proposal asociada (null si el offer no tiene proposalId todavia). Mismo
  // Map<governorProposalId, Date|null> que ya arma project.service.ts para hitos.
  proposalDeadline: Date | null,
): { votingExpired: boolean; votable: boolean; display: Display; viewer: { usesDeveloperVote: boolean } } {
  // Plazo de votacion vencido pero la propuesta sigue Active (el auto-resolver todavia no
  // le mando resolve() on-chain): sin esto la oferta seguia mostrando "En votación" y
  // habilitando el boton, y castVote/castDeveloperSaleVote revertian con "voting closed"
  // (FenrirGovernor: voting closed) recien al firmar la transaccion.
  const votingExpired =
    offer.status === "Voting" && offer.proposalId != null && proposalDeadline != null && proposalDeadline < new Date();

  return {
    votingExpired,
    // La oferta admite voto solo si esta en Voting, tiene proposalId asociado y esa
    // votacion no vencio.
    votable: offer.status === "Voting" && offer.proposalId != null && !votingExpired,
    // Etiqueta lista para renderizar: el frontend solo mapea variant a color/icono.
    display: offerDisplay({ status: offer.status, votingExpired }),
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
