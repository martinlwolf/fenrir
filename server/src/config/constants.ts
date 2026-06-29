// Constantes de configuracion del servidor. Editar aqui para cambiar comportamiento
// sin tocar la logica de negocio.

// ─── Ingestion ───────────────────────────────────────────────────────────────

/** Intervalo entre ciclos de polling on-chain (ms). */
export const POLL_INTERVAL_MS = 5_000;

// ─── Gobernanza (espejo de FenrirConstants.sol) ──────────────────────────────
// Solo para display; la decision real la toma el contrato.

export const QUORUM_BPS             = 5100;  // 51 %
export const APPROVAL_THRESHOLD_BPS = 5100;  // 51 %
export const BPS_DENOMINATOR        = 10000;
