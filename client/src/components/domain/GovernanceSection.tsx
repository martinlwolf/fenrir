import { useProposals } from "@/hooks/useProposals";
import { VotePanel } from "./VotePanel";
import { ArbiterElectionPanel } from "./ArbiterElectionPanel";
import { OpenArbiterElectionPanel } from "./OpenArbiterElectionPanel";
import { AnimationFlex } from "@/components/motion/Reveal";
import { LoadingState, EmptyState, ErrorState } from "./states";
import type { ProjectDetailResponse } from "@shared/schemas/project.schema";

// Lista las propuestas del proyecto y renderiza el panel adecuado segun el kind.
// El rol de árbitro lo determina el backend (proposal.viewer.canBreakTie.allowed);
// no se calcula aquí.
export function GovernanceSection({ project }: { project: ProjectDetailResponse }) {
  const { data, isLoading, isError, refetch } = useProposals(project.address);

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

  // El backend devuelve las propuestas en orden de creacion (asc, FR-020 no exige otro
  // orden): las mostramos en columna con la mas reciente arriba de todo y la primera al fondo.
  const latestFirst = [...data].reverse();

  return (
    <div className="space-y-4">
      {openElection}
      <AnimationFlex className="mx-auto w-full max-w-lg flex-col gap-4" from="top" stagger={0.08}>
        {latestFirst.map((proposal) =>
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
              // En una propuesta de Hito, refId es el indice del hito: pasamos su promesa para
              // que el inversor vea contra que verifica el cumplimiento al votar.
              milestoneDescription={
                proposal.kind === "Milestone"
                  ? project.milestones.find((m) => m.milestoneIndex === proposal.refId)?.description
                  : undefined
              }
            />
          ),
        )}
      </AnimationFlex>
    </div>
  );
}
