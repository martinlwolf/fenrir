// Playground de desarrollo (no linkeado en el nav, solo montado en DEV -- ver App.tsx) para
// ensayar la animacion de BuildingProgress sin depender de Sepolia ni del mock server: los
// hitos viven en estado local de React y un boton los va aprobando de a uno.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BuildingProgress } from "@/components/domain/BuildingProgress";
import type { MilestoneResponse } from "@shared/schemas/project.schema";

const TOTAL_MILESTONES = 6;

function fakeMilestone(index: number, approved: boolean): MilestoneResponse {
  return {
    milestoneIndex: index,
    description: `Hito de ensayo ${index + 1}`,
    budget: "0",
    durationSeconds: null,
    deadline: null,
    status: approved ? "Approved" : "Pending",
    retryCount: 0,
    trancheReleased: approved,
    reportHash: null,
    reportUrl: null,
    proposalId: null,
    display: approved
      ? { label: "Aprobado", variant: "success" }
      : { label: "Pendiente", variant: "secondary" },
    pausedForFunds: false,
    votingExpired: false,
    retryExpired: false,
    declarable: false,
    cumulativeBudget: "0",
    fundsShortfall: "0",
    viewer: { canDeclare: { allowed: false, reason: "Playground de ensayo" } },
  };
}

export function BuildingPlaygroundPage() {
  const [approvedCount, setApprovedCount] = useState(0);

  const milestones = Array.from({ length: TOTAL_MILESTONES }, (_, i) =>
    fakeMilestone(i, i < approvedCount),
  );
  const done = approvedCount >= TOTAL_MILESTONES;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Playground: BuildingProgress</h1>
        <p className="text-sm text-muted-foreground">
          Solo para ensayar la demo en local. Cada click simula que el DAO aprobó un hito más.
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setApprovedCount((n) => Math.min(TOTAL_MILESTONES, n + 1))} disabled={done}>
          Aprobar próximo hito
        </Button>
        <Button variant="outline" onClick={() => setApprovedCount(0)}>
          Reiniciar
        </Button>
      </div>

      <BuildingProgress milestones={milestones} />
    </div>
  );
}
