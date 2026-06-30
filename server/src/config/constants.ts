// Constantes de configuracion del servidor. Editar aqui para cambiar comportamiento
// sin tocar la logica de negocio.

// ─── Ingestion ───────────────────────────────────────────────────────────────

/** Intervalo entre ciclos de polling on-chain (ms). */
export const POLL_INTERVAL_MS = 1_000;

// ─── Auto-resolucion de propuestas vencidas ──────────────────────────────────

/** Cada cuanto el resolver busca propuestas Active vencidas para cerrarlas (ms). */
export const RESOLVER_POLL_INTERVAL_MS = 15_000;

/**
 * Margen extra sobre el deadline antes de intentar resolver (ms). El contrato exige
 * block.timestamp > deadline; este colchon evita revertir por desfasaje entre el reloj
 * del server y el del bloque.
 */
export const RESOLVER_DEADLINE_BUFFER_MS = 15_000;

// ─── Gobernanza (espejo de FenrirConstants.sol) ──────────────────────────────
// Solo para display; la decision real la toma el contrato.

export const QUORUM_BPS = 5100;  // 51 %
export const APPROVAL_THRESHOLD_BPS = 5100;  // 51 %
export const BPS_DENOMINATOR = 10000;
