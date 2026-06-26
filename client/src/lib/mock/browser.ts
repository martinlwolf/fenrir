// Worker MSW para el navegador. Se arranca solo si VITE_USE_MOCK=true (ver main.tsx).
// Requiere el service worker generado: `npx msw init public/ --save`.
import { setupWorker } from "msw/browser";
import { projectHandlers } from "./handlers/projects";
import { investorHandlers } from "./handlers/investors";
import { governanceHandlers } from "./handlers/governance";
import { developerHandlers } from "./handlers/developers";
import { saleHandlers } from "./handlers/sale";

export const worker = setupWorker(
  ...projectHandlers,
  ...investorHandlers,
  ...governanceHandlers,
  ...developerHandlers,
  ...saleHandlers,
);

export async function startMockWorker(): Promise<void> {
  await worker.start({ onUnhandledRequest: "bypass" });
}
