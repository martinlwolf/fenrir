// Listener de eventos on-chain por POLLING. En cada ciclo recorre, en chunks, el
// rango de bloques [cursor+1 .. safeBlock] (safeBlock = head - confirmaciones, para
// tolerar reorgs cortos), parsea los logs de factory + proyectos + governors conocidos
// y los despacha a sus handlers a traves de applyOnce (idempotente). El polling es
// deliberadamente simple y resistente: una reconexion o un atraso se recuperan solos
// en el siguiente ciclo, sin perder ni duplicar eventos (FR-005, SC-005).
import { Interface, type Log } from "ethers";
import { env } from "../config/env";
import { ABIS } from "./abis";
import { provider } from "./provider";
import {
  factoryHandlers,
  governorContractHandlers,
  projectContractHandlers,
} from "./handlers";
import type { HandlerMap } from "./handlers/types";
import { applyOnce, loadCursor, saveCursor } from "../services/ingestion.service";
import { listSyncTargets } from "../daos/project.dao";

const SCOPE = "main";
const POLL_INTERVAL_MS = 10_000;

const factoryIface = new Interface(ABIS.FenrirFactory);
const projectIface = new Interface(ABIS.FenrirProject);
const governorIface = new Interface(ABIS.FenrirGovernor);

let running = false;
let timer: NodeJS.Timeout | null = null;

async function dispatchLog(
  iface: Interface,
  handlers: HandlerMap,
  log: Log,
): Promise<void> {
  let parsed;
  try {
    parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
  } catch {
    return; // evento que no esta en nuestro ABI: ignorar
  }
  if (!parsed) return;
  const handler = handlers[parsed.name];
  if (!handler) return;

  const meta = {
    transactionHash: log.transactionHash,
    index: log.index,
    blockNumber: log.blockNumber,
    eventName: parsed.name,
  };
  await applyOnce(meta, () => handler({ args: parsed.args, address: log.address, meta }));
}

async function scanAddress(
  address: string,
  iface: Interface,
  handlers: HandlerMap,
  fromBlock: number,
  toBlock: number,
): Promise<void> {
  const logs = await provider.getLogs({ address, fromBlock, toBlock });
  // Orden estable por bloque y logIndex para reflejar transiciones en orden.
  logs.sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);
  for (const log of logs) {
    await dispatchLog(iface, handlers, log);
  }
}

async function runCycle(): Promise<void> {
  const head = await provider.getBlockNumber();
  const safeBlock = head - env.INGESTION_CONFIRMATIONS;
  if (safeBlock < 0) return;

  const cursor = await loadCursor(SCOPE, env.INGESTION_START_BLOCK);
  const from = cursor === BigInt(env.INGESTION_START_BLOCK) ? Number(cursor) : Number(cursor) + 1;
  if (from > safeBlock) return;

  const batch = env.INGESTION_BACKFILL_BATCH;
  for (let start = from; start <= safeBlock; start += batch) {
    const end = Math.min(start + batch - 1, safeBlock);

    // 1) Factory primero: crea/actualiza developers y proyectos en este rango.
    await scanAddress(env.FENRIR_FACTORY_ADDRESS, factoryIface, factoryHandlers, start, end);

    // 2) Con los proyectos ya conocidos (incluidos los recien creados), escanear
    //    cada proyecto y su governor en el mismo rango.
    const targets = await listSyncTargets();
    for (const t of targets) {
      await scanAddress(t.address, projectIface, projectContractHandlers, start, end);
      await scanAddress(t.governorAddress, governorIface, governorContractHandlers, start, end);
    }

    await saveCursor(SCOPE, BigInt(end));
  }
}

async function tick(): Promise<void> {
  if (running) return; // evita solapamiento de ciclos
  running = true;
  try {
    await runCycle();
  } catch (err) {
    console.error("[listener] error en ciclo de ingestion:", err);
  } finally {
    running = false;
  }
}

export function startListener(): void {
  console.log("[listener] iniciando ingestion por polling cada", POLL_INTERVAL_MS, "ms");
  void tick();
  timer = setInterval(() => void tick(), POLL_INTERVAL_MS);
}

export function stopListener(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
