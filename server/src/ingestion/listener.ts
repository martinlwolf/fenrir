// Listener de eventos on-chain por POLLING. En cada ciclo recorre, en chunks, el
// rango de bloques [cursor+1 .. safeBlock] (safeBlock = head - confirmaciones, para
// tolerar reorgs cortos), parsea los logs de factory + proyectos + governors conocidos
// y los despacha a sus handlers a traves de applyOnce (idempotente). El polling es
// deliberadamente simple y resistente: una reconexion o un atraso se recuperan solos
// en el siguiente ciclo, sin perder ni duplicar eventos (FR-005, SC-005).
import { Interface, type Log, type Provider } from "ethers";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { ABIS } from "../models/onchain/abis";
import { provider as defaultProvider } from "../models/onchain/provider";
import { ProjectRepository, projectRepository } from "../persistence/repositories/project.repository";
import {
  factoryHandlers,
  governorContractHandlers,
  projectContractHandlers,
} from "./handlers";
import type { HandlerMap } from "./handlers/types";
import { IngestionService, ingestionService, OnChainEventMeta } from "./ingestion.service";

// Empareja el ABI de un contrato con sus handlers, para no mantener `iface` y
// `handlers` sueltos en paralelo: una fuente de eventos viaja como una sola cosa y
// agregar un contrato nuevo es construir un EventSource mas.
class EventSource {
  readonly iface: Interface;
  constructor(
    abi: string[],
    readonly handlers: HandlerMap,
  ) {
    this.iface = new Interface(abi);
  }
}

const SCOPE = "main";
const POLL_INTERVAL_MS = 10_000;

export class OnChainListener {
  private readonly factory = new EventSource(ABIS.FenrirFactory, factoryHandlers);
  private readonly project = new EventSource(ABIS.FenrirProject, projectContractHandlers);
  private readonly governor = new EventSource(ABIS.FenrirGovernor, governorContractHandlers);

  private running = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly provider: Provider = defaultProvider,
    private readonly ingestion: IngestionService = ingestionService,
    private readonly projects: ProjectRepository = projectRepository,
  ) { }

  start(): void {
    logger.info({ pollIntervalMs: POLL_INTERVAL_MS }, "iniciando ingestion por polling");
    void this.tick();
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async dispatchLog(source: EventSource, log: Log): Promise<void> {
    let parsed;
    try {
      parsed = source.iface.parseLog({ topics: [...log.topics], data: log.data });
    } catch {
      return; // evento que no esta en nuestro ABI: ignorar
    }
    if (!parsed) return;
    const handler = source.handlers[parsed.name];
    if (!handler) return;

    const meta = {
      transactionHash: log.transactionHash,
      index: log.index,
      blockNumber: log.blockNumber,
      eventName: parsed.name,
    } as OnChainEventMeta;
    
    await this.ingestion.applyOnce(meta, () =>
      handler({ args: parsed.args, address: log.address, meta }),
    );
  }

  private async scan(
    address: string,
    source: EventSource,
    fromBlock: number,
    toBlock: number,
  ): Promise<void> {
    const logs = await this.provider.getLogs({ address, fromBlock, toBlock });
    // Orden estable por bloque y logIndex para reflejar transiciones en orden.
    logs.sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);
    for (const log of logs) {
      await this.dispatchLog(source, log);
    }
  }

  private async runCycle(): Promise<void> {
    const head = await this.provider.getBlockNumber();
    const safeBlock = head - env.INGESTION_CONFIRMATIONS;
    if (safeBlock < 0) return;

    const cursor = await this.ingestion.loadCursor(SCOPE, env.INGESTION_START_BLOCK); // el ultimo bloque que ya procese
    const from = cursor === BigInt(env.INGESTION_START_BLOCK) ? Number(cursor) : Number(cursor) + 1;
    if (from > safeBlock) return;

    const batch = env.INGESTION_BACKFILL_BATCH;
    for (let start = from; start <= safeBlock; start += batch) {
      const end = Math.min(start + batch - 1, safeBlock);

      // 1) Factory primero: crea/actualiza developers y proyectos en este rango.
      await this.scan(env.FENRIR_FACTORY_ADDRESS, this.factory, start, end);

      // 2) Con los proyectos ya conocidos (incluidos los recien creados), escanear
      //    cada proyecto y su governor en el mismo rango.
      const targets = await this.projects.listSyncTargets();
      for (const t of targets) {
        await this.scan(t.address, this.project, start, end);
        await this.scan(t.governorAddress, this.governor, start, end);
      }

      await this.ingestion.saveCursor(SCOPE, BigInt(end));
    }
  }

  private async tick(): Promise<void> {
    if (this.running) return; // evita solapamiento de ciclos
    this.running = true;
    try {
      await this.runCycle();
    } catch (err) {
      logger.error({ err }, "error en ciclo de ingestion");
    } finally {
      this.running = false;
    }
  }
}

export const onChainListener = new OnChainListener();
