// Auto-resolutor de propuestas vencidas. El FenrirGovernor NO se auto-cierra al vencer el
// plazo: alguien tiene que llamar resolve(proposalId). Sin esto, una votacion vencida queda
// para siempre en estado Active ("En votacion") y el proyecto no avanza. Este servicio, si hay
// un signer configurado (RESOLVER_PRIVATE_KEY), busca periodicamente las propuestas Active
// cuyo plazo vencio y les manda resolve() on-chain. El resultado (resuelta / extendida /
// esperando arbitro) lo capta el listener por sus eventos, como cualquier otra transicion.
import { RESOLVER_DEADLINE_BUFFER_MS, RESOLVER_POLL_INTERVAL_MS } from "../config/constants";
import { logger } from "../config/logger";
import { governorContractAsResolver, resolverSigner } from "../models/onchain/provider";
import { ProjectRepository, projectRepository } from "../persistence/repositories/project.repository";
import { ProposalRepository, proposalRepository } from "../persistence/repositories/proposal.repository";

export class ProposalResolver {
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  // Propuestas con un resolve() en vuelo, para no reenviar la tx en cada tick mientras mina.
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly proposals: ProposalRepository = proposalRepository,
    private readonly projects: ProjectRepository = projectRepository,
  ) {}

  start(): void {
    if (!resolverSigner) {
      logger.warn(
        "auto-resolutor desactivado: definir RESOLVER_PRIVATE_KEY para cerrar votaciones vencidas automaticamente",
      );
      return;
    }
    logger.info(
      { resolver: resolverSigner.address, intervalMs: RESOLVER_POLL_INTERVAL_MS },
      "iniciando auto-resolutor de propuestas vencidas",
    );
    void this.tick();
    this.timer = setInterval(() => void this.tick(), RESOLVER_POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const before = new Date(Date.now() - RESOLVER_DEADLINE_BUFFER_MS);
      const expired = await this.proposals.listExpiredActive(before);
      if (expired.length === 0) return;

      // projectAddress -> governorAddress (ambos en minuscula desde la DB).
      const targets = await this.projects.listSyncTargets();
      const governorByProject = new Map(
        targets.map((t) => [t.address.toLowerCase(), t.governorAddress]),
      );

      for (const p of expired) {
        const key = `${p.projectAddress}:${p.governorProposalId}`;
        if (this.inFlight.has(key)) continue;
        const governorAddress = governorByProject.get(p.projectAddress.toLowerCase());
        if (!governorAddress) {
          logger.warn({ ...p }, "auto-resolutor: sin governor para el proyecto, se omite");
          continue;
        }
        this.inFlight.add(key);
        void this.resolveOne(key, governorAddress, p.governorProposalId);
      }
    } catch (err) {
      logger.error({ err }, "error en ciclo del auto-resolutor");
    } finally {
      this.running = false;
    }
  }

  private async resolveOne(
    key: string,
    governorAddress: string,
    proposalId: number,
  ): Promise<void> {
    try {
      const governor = governorContractAsResolver(governorAddress);
      const tx = await governor.resolve(proposalId);
      logger.info({ governorAddress, proposalId, tx: tx.hash }, "auto-resolutor: resolve() enviado");
      await tx.wait(1);
      logger.info({ governorAddress, proposalId, tx: tx.hash }, "auto-resolutor: resolve() confirmado");
    } catch (err) {
      // Reverts esperables y benignos: la votacion todavia esta abierta segun el bloque
      // (desfasaje de reloj) o ya la resolvio otro y el listener todavia no lo reflejo.
      logger.warn(
        { governorAddress, proposalId, err: (err as Error).message },
        "auto-resolutor: resolve() fallo (se reintenta en el proximo ciclo)",
      );
    } finally {
      this.inFlight.delete(key);
    }
  }
}

export const proposalResolver = new ProposalResolver();
