// Funciones puras de derivacion y capabilities a nivel hito y de mantenimiento del proyecto.
// Centralizan la logica que antes vivia en el frontend (client/src/components/domain/
// MilestoneList.tsx y MaintenancePanel.tsx): estados derivados del hito, presupuesto acumulado
// y permisos del viewer. NO consultan repos ni deciden nada on-chain; reciben el estado ya
// cargado y derivan sobre el espejo (FR-020).
import type { MilestoneStatusValue, ProjectStatusValue } from "@shared/constants/enums";
import type { Capability, Display } from "@shared/schemas/common.schema";
import { milestoneDisplay } from "./display";
import type { ViewerContext } from "./Viewer";

// Estado minimo del hito que necesita la derivacion. Se define local (no se importa el model)
// para no acoplar la policy a persistence ni arriesgar un ciclo de imports.
export interface MilestoneInput {
  milestoneIndex: number;
  status: MilestoneStatusValue;
  budget: bigint;
  deadline: Date | null;
  retryCount: number;
  proposalId: number | null;
}

// Estado minimo del proyecto que necesitan las derivaciones de hito/mantenimiento.
export interface MilestoneProjectInput {
  status: ProjectStatusValue;
  currentArbiter: string | null;
  totalRaised: bigint;
  fmpa: bigint;
  fundingDeadline: Date;
  currentMilestoneIndex: number;
}

// Extras derivados por hito que el service compone sobre toResponse(). wei como bigint aca;
// el service los convierte a string en el DTO.
export interface MilestoneDerived {
  display: Display;
  pausedForFunds: boolean;
  votingExpired: boolean;
  retryExpired: boolean;
  declarable: boolean;
  cumulativeBudget: bigint;
  fundsShortfall: bigint;
}

// Forma final (DTO) de los extras por hito: igual que MilestoneDerived pero con wei->string y
// el bloque viewer con la capability. Es exactamente lo que el schema exige de mas por hito.
export interface MilestoneExtras {
  display: Display;
  pausedForFunds: boolean;
  votingExpired: boolean;
  retryExpired: boolean;
  declarable: boolean;
  cumulativeBudget: string;
  fundsShortfall: string;
  viewer: { canDeclare: Capability };
}

// Presupuesto acumulado hasta `index` inclusive (espeja _cumulativeBudget on-chain y
// MilestoneList.tsx:156-159): suma los budgets de los hitos con milestoneIndex <= index,
// independiente del orden del array.
export function cumulativeBudget(milestones: MilestoneInput[], index: number): bigint {
  return milestones
    .filter((m) => m.milestoneIndex <= index)
    .reduce((sum, m) => sum + m.budget, 0n);
}

// La obra ya arranco: Building + arbitro electo (MilestoneList.tsx:144 obraStarted). Recien ahi
// el contrato acepta declareMilestone.
function obraStarted(project: MilestoneProjectInput): boolean {
  return project.status === "Building" && project.currentArbiter != null;
}

// Deriva los estados de UN hito espejando MilestoneList.tsx. `positionApprovedBefore` = todos
// los hitos con posicion anterior en el array estan Approved (:182 slice(0,i).every) -- OJO: es
// por posicion en el array, no por milestoneIndex.
function deriveOne(
  project: MilestoneProjectInput,
  milestones: MilestoneInput[],
  m: MilestoneInput,
  positionApprovedBefore: boolean,
  proposalDeadlines: Map<number, Date | null>,
  now: Date,
): MilestoneDerived {
  const required = cumulativeBudget(milestones, m.milestoneIndex);
  // Un hito Declared (no Voting) significa que _tryOpenVoting no pudo abrir la votacion: la
  // unica causa es que falten fondos para financiarlo (:174).
  const pausedForFunds = m.status === "Declared" && project.totalRaised < required;
  const fundsShortfall = pausedForFunds ? required - project.totalRaised : 0n; // :189

  // Plazo de votacion vencido pero la propuesta sigue Active (:183-187).
  const dl = m.proposalId != null ? proposalDeadlines.get(m.proposalId) : null;
  const votingExpired =
    m.status === "Voting" && m.proposalId != null && dl != null && dl < now;

  // Tras un rechazo el hito vuelve a Pending con ventana de reintento corta (:45-46).
  const isRetryWindow = m.status === "Pending" && m.retryCount > 0;
  const retryExpired = isRetryWindow && m.deadline != null && m.deadline < now;

  // Hitos secuenciales: solo declarable si todos los anteriores estan aprobados y ya arranco la
  // obra (:38-41 + :144).
  const declarable =
    obraStarted(project) &&
    positionApprovedBefore &&
    (m.status === "Pending" || m.status === "Rejected");

  const display = milestoneDisplay({
    status: m.status,
    votingExpired,
    pausedForFunds,
    retryExpired,
  });

  return {
    display,
    pausedForFunds,
    votingExpired,
    retryExpired,
    declarable,
    cumulativeBudget: required,
    fundsShortfall,
  };
}

// Capability del viewer para declarar un hito. El backend decide `allowed` + `reason`; el front
// solo habilita/deshabilita la UI (espeja el gating de MilestoneList.tsx:144 + declarable).
export function milestoneCapabilities(
  derived: Pick<MilestoneDerived, "declarable">,
  viewer: ViewerContext,
): { canDeclare: Capability } {
  if (!viewer.isDeveloper) {
    return {
      canDeclare: { allowed: false, reason: "Solo el desarrollador puede declarar hitos" },
    };
  }
  if (!derived.declarable) {
    return {
      canDeclare: { allowed: false, reason: "Este hito todavía no se puede declarar" },
    };
  }
  return { canDeclare: { allowed: true } };
}

// Enriquece un array de hitos con sus extras derivados, en el MISMO orden del array de entrada.
// `positionApprovedBefore` se calcula con slice(0, i) sobre el array recibido: por eso el array
// debe venir ordenado por milestoneIndex para que la secuencialidad sea correcta.
export function enrichMilestones(
  project: MilestoneProjectInput,
  milestones: MilestoneInput[],
  proposalDeadlines: Map<number, Date | null>,
  viewer: ViewerContext,
): MilestoneExtras[] {
  const now = new Date();
  return milestones.map((m, i) => {
    const positionApprovedBefore = milestones
      .slice(0, i)
      .every((p) => p.status === "Approved");
    const derived = deriveOne(
      project,
      milestones,
      m,
      positionApprovedBefore,
      proposalDeadlines,
      now,
    );
    const { canDeclare } = milestoneCapabilities(derived, viewer);
    return {
      display: derived.display,
      pausedForFunds: derived.pausedForFunds,
      votingExpired: derived.votingExpired,
      retryExpired: derived.retryExpired,
      declarable: derived.declarable,
      cumulativeBudget: derived.cumulativeBudget.toString(),
      fundsShortfall: derived.fundsShortfall.toString(),
      viewer: { canDeclare },
    };
  });
}

// Estado de mantenimiento del proyecto (casos borde que lo destraban). Espeja
// MaintenancePanel.tsx:35-53. wei como bigint aca; el service lo entrega ya en el shape del DTO.
export interface ProjectMaintenance {
  fundingExpired: boolean;
  stalled: { active: boolean; reason: string | null };
  canCancelStalled: Capability;
}

export function projectMaintenance(
  project: MilestoneProjectInput,
  milestones: MilestoneInput[],
  viewer: ViewerContext,
): ProjectMaintenance {
  const now = new Date();

  // Fondeo vencido sin alcanzar el FMPA: cancelable para habilitar el reembolso 100% (:35-38).
  const fundingExpired =
    project.status === "Funding" &&
    project.fundingDeadline < now &&
    project.totalRaised < project.fmpa;

  const building = project.status === "Building";
  const current = milestones.find(
    (m) => m.milestoneIndex === project.currentMilestoneIndex,
  );
  // Presupuesto acumulado hasta el hito vigente inclusive (:45-47).
  const cumulativeBudgetCurrent = cumulativeBudget(
    milestones,
    project.currentMilestoneIndex,
  );

  // El hito vigente vencio en su ventana (Pending + deadline pasado) (:48).
  const deadlineMissed =
    building &&
    current?.status === "Pending" &&
    current.deadline != null &&
    current.deadline < now;
  // Quedo declarado sin los fondos para abrir votacion (:49-50).
  const stalledForFunds =
    building &&
    current?.status === "Declared" &&
    project.totalRaised < cumulativeBudgetCurrent;

  const active = Boolean(deadlineMissed || stalledForFunds);
  const reason = deadlineMissed
    ? "El hito vigente venció sin que el desarrollador lo (re)declarara a tiempo"
    : stalledForFunds
      ? "El hito quedó declarado pero no se juntaron los fondos para abrir su votación"
      : null;

  return {
    fundingExpired,
    stalled: { active, reason },
    canCancelStalled: cancelStalledCapability(active, viewer),
  };
}

// Solo un inversor del proyecto (FDT > 0) puede cancelar un hito estancado on-chain; el
// developer no invierte en su propio proyecto (MaintenancePanel.tsx:29-32, 95-108).
function cancelStalledCapability(stalledActive: boolean, viewer: ViewerContext): Capability {
  if (!stalledActive) {
    return { allowed: false, reason: "El proyecto no está estancado" };
  }
  if (!viewer.isInvestor) {
    return {
      allowed: false,
      reason: "Solo un inversor del proyecto (con FDT) puede cancelar",
    };
  }
  return { allowed: true };
}
