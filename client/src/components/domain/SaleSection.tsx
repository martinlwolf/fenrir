import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OfferStatusBadge } from "./StatusBadge";
import { MakeOfferDialog } from "./MakeOfferDialog";
import { TxFeedback } from "./TxFeedback";
import { LoadingState, EmptyState } from "./states";
import { useWallet } from "@/providers/WalletProvider";
import { useOffers, useDistribution } from "@/hooks/useOffers";
import { useWrite } from "@/hooks/useWrite";
import {
  castDeveloperSaleVote,
  castVote,
  claimDistribution,
  executeSale,
} from "@/lib/chain/contracts";
import { formatWei } from "@/lib/format";
import { AddressTag } from "./AddressTag";
import type { ProjectDetailResponse } from "@shared/schemas/project.schema";
import type { SaleOfferResponse } from "@shared/schemas/sale.schema";

function OfferRow({
  offer,
  governorAddress,
  projectAddress,
}: {
  offer: SaleOfferResponse;
  governorAddress: string;
  projectAddress: string;
}) {
  const { address, isOnSepolia } = useWallet();
  const { phase, error, run } = useWrite([
    ["offers", projectAddress],
    ["proposals", projectAddress],
  ]);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";

  // `offer.votable` lo decide el backend (Voting + proposalId valido). El front solo habilita
  // la accion de voto cuando el DTO lo autoriza.
  // `offer.viewer.usesDeveloperVote` indica si el votante usa castDeveloperSaleVote (developer)
  // en lugar de castVote (inversor). El front no necesita conocer el rol directamente.
  function voteOffer(support: boolean) {
    const proposalId = offer.proposalId as number;
    void run(() =>
      offer.viewer.usesDeveloperVote
        ? castDeveloperSaleVote(governorAddress, proposalId, support)
        : castVote(governorAddress, proposalId, support),
    );
  }

  return (
    <div className="flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{formatWei(offer.amount)}</span>
          <OfferStatusBadge status={offer.status} display={offer.display} />
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Comprador: <AddressTag address={offer.buyerWallet} />
        </p>
        <TxFeedback phase={phase} error={error} />
      </div>
      {offer.votable && address && isOnSepolia && (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={() => voteOffer(true)}>
            A favor
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => voteOffer(false)}>
            En contra
          </Button>
        </div>
      )}
    </div>
  );
}

function DistributionPanel({ project }: { project: ProjectDetailResponse }) {
  const { address, isOnSepolia } = useWallet();
  const { data, isLoading } = useDistribution(project.address, !!project.salePrice);
  const { phase, error, run } = useWrite([
    ["distribution", project.address],
    ["claimable", address],
  ]);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";

  if (!project.salePrice) return null;
  if (isLoading) return <LoadingState />;
  if (!data) return null;

  const myShare = data.shares.find((s) => s.investorWallet === address);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Reparto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Precio de venta</span>
          <span className="font-medium">{formatWei(data.salePrice)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pool de reparto</span>
          <span className="font-medium">{formatWei(data.distributionPool)}</span>
        </div>
        {myShare && (
          <div className="flex items-center justify-between gap-2 pt-2">
            <span>Tu parte reclamable: {formatWei(myShare.claimable)}</span>
            {address && isOnSepolia && (
              <Button
                size="sm"
                disabled={busy}
                onClick={() => void run(() => claimDistribution(project.address))}
              >
                {busy ? "Procesando…" : "Reclamar reparto"}
              </Button>
            )}
          </div>
        )}
        <TxFeedback phase={phase} error={error} />
      </CardContent>
    </Card>
  );
}

// Banner para concretar la venta tras aprobarse una oferta. Sin executeSale no se fija el
// salePrice ni se habilita el reparto. Cualquiera puede ejecutarla.
function ExecuteSaleBanner({ project }: { project: ProjectDetailResponse }) {
  const { address, isOnSepolia } = useWallet();
  const { phase, error, run } = useWrite([
    ["project", project.address],
    ["offers", project.address],
    ["distribution", project.address],
  ]);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Venta aprobada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Hay una oferta aprobada. Ejecutá la venta para fijar el precio y habilitar el reparto.
        </p>
        {address && isOnSepolia && (
          <Button size="sm" disabled={busy} onClick={() => void run(() => executeSale(project.address))}>
            {busy ? "Procesando…" : "Ejecutar venta"}
          </Button>
        )}
        <TxFeedback phase={phase} error={error} />
      </CardContent>
    </Card>
  );
}

export function SaleSection({ project }: { project: ProjectDetailResponse }) {
  const offers = useOffers(project.address);
  // El backend decide si la venta puede ejecutarse; el front solo lee la capability del DTO.
  const canExecuteSale = project.viewer.capabilities.canExecuteSale.allowed;

  return (
    <div className="space-y-4">
      {canExecuteSale && <ExecuteSaleBanner project={project} />}

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Ofertas de compra</CardTitle>
          <MakeOfferDialog projectAddress={project.address} />
        </CardHeader>
        <CardContent>
          {offers.isLoading ? (
            <LoadingState />
          ) : !offers.data || offers.data.length === 0 ? (
            <EmptyState title="Sin ofertas todavía" />
          ) : (
            offers.data.map((o) => (
              <OfferRow
                key={o.offerId}
                offer={o}
                governorAddress={project.governorAddress}
                projectAddress={project.address}
              />
            ))
          )}
        </CardContent>
      </Card>

      <DistributionPanel project={project} />
    </div>
  );
}
