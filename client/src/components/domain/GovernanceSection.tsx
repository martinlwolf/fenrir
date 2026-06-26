import { useProposals } from "@/hooks/useProposals";
import { VotePanel } from "./VotePanel";
import { ArbiterElectionPanel } from "./ArbiterElectionPanel";
import { LoadingState, EmptyState, ErrorState } from "./states";
import type { ProjectDetailResponse } from "@shared/schemas/project.schema";

// Lista las propuestas del proyecto y renderiza el panel adecuado segun el kind.
export function GovernanceSection({ project }: { project: ProjectDetailResponse }) {
  const { data, isLoading, isError, refetch } = useProposals(project.address);

  if (isLoading) return <LoadingState label="Cargando propuestas…" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!data || data.length === 0)
    return <EmptyState title="Sin propuestas activas" />;

  return (
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
          />
        ),
      )}
    </div>
  );
}
