import { useProposals } from "@/hooks/useProposals";
import { useArbiter } from "@/hooks/useArbiter";
import { useWallet } from "@/providers/WalletProvider";
import { VotePanel } from "./VotePanel";
import { ArbiterElectionPanel } from "./ArbiterElectionPanel";
import { OpenArbiterElectionPanel } from "./OpenArbiterElectionPanel";
import { LoadingState, EmptyState, ErrorState } from "./states";
import { sameAddress } from "@/lib/format";
import type { ProjectDetailResponse } from "@shared/schemas/project.schema";

// Lista las propuestas del proyecto y renderiza el panel adecuado segun el kind.
export function GovernanceSection({ project }: { project: ProjectDetailResponse }) {
  const { data, isLoading, isError, refetch } = useProposals(project.address);
  const { address } = useWallet();
  const arbiter = useArbiter(project.address);
  const isArbiter = sameAddress(arbiter.data?.currentArbiter, address);

  // Botón para abrir la elección de árbitro (lee on-chain). Se muestra arriba de todo y aparece
  // aunque todavía no haya propuestas espejadas en el backend.
  const openElection = <OpenArbiterElectionPanel projectAddress={project.address} />;

  if (isLoading) return <LoadingState label="Cargando propuestas…" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!data || data.length === 0)
    return (
      <div className="space-y-4">
        {openElection}
        <EmptyState title="Sin propuestas activas" />
      </div>
    );

  return (
    <div className="space-y-4">
      {openElection}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.map((proposal) =>
        proposal.kind === "ArbiterElection" ? (
          <ArbiterElectionPanel
            key={proposal.governorProposalId}
            governorAddress={project.governorAddress}
            projectAddress={project.address}
            proposal={proposal}
          />
        ) : (
          <VotePanel
            key={proposal.governorProposalId}
            projectAddress={project.address}
            governorAddress={project.governorAddress}
            proposal={proposal}
            isArbiter={isArbiter}
          />
        ),
        )}
      </div>
    </div>
  );
}
