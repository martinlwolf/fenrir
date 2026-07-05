// Corazon del refactor backend-driven: dado un proyecto y la wallet que consulta (el
// "viewer"), deriva su contexto -> que rol tiene y que relaciones mantiene con el proyecto.
// A partir de este ViewerContext, la capa de policy calcula capabilities/estados/labels que
// viajan embebidos en los DTOs. NO decide nada on-chain ni persiste: solo lee el espejo
// (FR-020: el espejo refleja, no decide). La seguridad real vive en los contratos.
import type { ProjectStatusValue, ViewerRoleValue } from "@shared/constants/enums";
import {
  InvestmentRepository,
  investmentRepository,
} from "../persistence/repositories/investment.repository";

// Datos minimos del proyecto que necesita la derivacion. Se define local (no se importa el
// model) para no acoplar la policy a persistence ni arriesgar un ciclo de imports.
export interface ViewerProjectInput {
  address: string;
  developerWallet: string;
  currentArbiter: string | null;
  status: ProjectStatusValue;
}

export interface ViewerContext {
  wallet: string | null;
  role: ViewerRoleValue;
  isDeveloper: boolean;
  isArbiter: boolean;
  isInvestor: boolean;
}

// Solo se necesita hasInvested para derivar isInvestor. Se pide el shape minimo (no el repo
// entero) para poder inyectar un resolvedor en memoria: en la lista, el service precomputa el
// set de proyectos del viewer y pasa un hasInvested que consulta ese set sin tocar la DB.
export type InvestorLookup = Pick<InvestmentRepository, "hasInvested">;

export interface BuildViewerDeps {
  investments: InvestorLookup;
}

// Compara dos direcciones EVM ignorando mayus/minus. Null/undefined nunca matchea.
function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export async function buildViewer(
  project: ViewerProjectInput,
  wallet: string | null,
  deps: BuildViewerDeps = { investments: investmentRepository },
): Promise<ViewerContext> {
  const isDeveloper = sameAddress(wallet, project.developerWallet);
  const isArbiter = sameAddress(wallet, project.currentArbiter);
  const isInvestor =
    wallet != null && (await deps.investments.hasInvested(project.address, wallet));

  // Precedencia: developer > arbiter > investor > buyer (solo en venta) > anonimo.
  const role: ViewerRoleValue = resolveRole({
    wallet,
    status: project.status,
    isDeveloper,
    isArbiter,
    isInvestor,
  });

  return { wallet, role, isDeveloper, isArbiter, isInvestor };
}

function resolveRole(input: {
  wallet: string | null;
  status: ProjectStatusValue;
  isDeveloper: boolean;
  isArbiter: boolean;
  isInvestor: boolean;
}): ViewerRoleValue {
  if (input.wallet == null) return "anonymous";
  if (input.isDeveloper) return "developer";
  if (input.isArbiter) return "arbiter";
  if (input.isInvestor) return "investor";
  // Comprador potencial: hay una wallet conectada, el proyecto esta en venta y no es
  // developer ni inversor del proyecto.
  if (input.status === "Selling" && !input.isDeveloper && !input.isInvestor) {
    return "buyer";
  }
  return "anonymous";
}
