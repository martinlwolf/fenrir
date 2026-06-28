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
import { formatWei, sameAddress, shortAddress } from "@/lib/format";
import type { ProjectDetailResponse } from "@shared/schemas/project.schema";
import type { SaleOfferResponse } from "@shared/schemas/sale.schema";

function OfferRow({
  offer,
  governorAddress,
  projectAddress,
  developerWallet,
}: {
  offer: SaleOfferResponse;
  governorAddress: string;
  projectAddress: string;
  developerWallet: string;
}) {
  const { address, isOnSepolia } = useWallet();
  const { phase, error, run } = useWrite([
    ["offers", projectAddress],
    ["proposals", projectAddress],
  ]);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";
  const votable = offer.status === "Voting" && offer.proposalId != null;
  // Voto role-aware: el developer (sin FDT) usa castDeveloperSaleVote; el inversor vota con
  // su peso por FDT vía castVote. Llamar castDeveloperSaleVote como inversor revierte.
  const isDeveloper = sameAddress(address, developerWallet);

  function voteOffer(support: boolean) {
    const proposalId = offer.proposalId as number;
    void run(() =>
      isDeveloper
        ? castDeveloperSaleVote(governorAddress, proposalId, support)
        : castVote(governorAddress, proposalId, support),
    );
  }

  return (
    <div className="flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{formatWei(offer.amount)}</span>
          <OfferStatusBadge status={offer.status} />
        </div>
        <p className="text-sm text-muted-foreground">Comprador: {shortAddress(offer.buyerWallet)}</p>
        <TxFeedback phase={phase} error={error} />
      </div>
      {votable && address && isOnSepolia && (
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
  const hasApproved = offers.data?.some((o) => o.status === "Approved") ?? false;
  const canExecuteSale = project.status === "Selling" && hasApproved;

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
                developerWallet={project.developerWallet}
              />
            ))
          )}
        </CardContent>
      </Card>

      <DistributionPanel project={project} />
    </div>
  );
}
