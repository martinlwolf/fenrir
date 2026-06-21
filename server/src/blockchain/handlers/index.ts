// Registro de handlers de eventos, agrupados por el contrato que los emite. Cada
// dominio (project, milestone, governance, developer, sale) aporta su mapa. El
// listener consulta estos mapas para despachar cada log parseado.
import type { HandlerMap } from "./types";
import { projectHandlers } from "./project.handlers";
import { milestoneHandlers } from "./milestone.handlers";
import { governanceHandlers } from "./governance.handlers";
import { developerHandlers } from "./developer.handlers";
import { saleHandlers } from "./sale.handlers";

// Eventos emitidos por FenrirFactory.
export const factoryHandlers: HandlerMap = {
  ...developerHandlers,
  ...projectHandlers.factory,
};

// Eventos emitidos por una instancia de FenrirProject.
export const projectContractHandlers: HandlerMap = {
  ...projectHandlers.project,
  ...milestoneHandlers,
  ...saleHandlers,
};

// Eventos emitidos por una instancia de FenrirGovernor.
export const governorContractHandlers: HandlerMap = {
  ...governanceHandlers,
};
