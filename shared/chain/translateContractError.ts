// Traduce al español el error de un revert de los contratos Fenrir. No hace match exacto
// porque cada proveedor envuelve el motivo distinto, por ejemplo:
//   ethers:   execution reverted: "FenrirGovernor: voting closed"
//   Hardhat:  VM Exception while processing transaction: reverted with reason string
//             'FenrirGovernor: voting closed'
//   viem:     The contract function "castVote" reverted with the following reason:
//             FenrirGovernor: voting closed
// En los cuatro casos el string exacto del require() sigue apareciendo entero en algun
// lado del mensaje, asi que se busca por inclusion en vez de igualdad.
//
// Si ninguna entrada del diccionario matchea, nunca se devuelve un mensaje generico que
// tape el motivo real (ver incidente: "insufficient funds" quedaba escondido detras de un
// "se revirtio sin motivo especifico"): el ultimo recurso pega el mensaje crudo original,
// aunque quede en ingles, para que el usuario siempre sepa que paso de verdad.
import contractErrorsEs from "./contract-errors.es.json";

interface TranslatableError {
  code?: string;
  reason?: string | null;
  shortMessage?: string;
  message?: string;
  errorName?: string;
  data?: { errorName?: string };
  cause?: { data?: { errorName?: string } };
}

const PANIC_CODE_PATTERN = /panic code (0x[0-9a-fA-F]+)/i;
const RAW_MESSAGE_MAX_LENGTH = 300;

export function translateContractError(error: unknown): string {
  const err = (error ?? {}) as TranslatableError;

  const errorName = err.errorName ?? err.data?.errorName ?? err.cause?.data?.errorName;
  if (errorName && errorName in contractErrorsEs.openZeppelin) {
    return contractErrorsEs.openZeppelin[errorName as keyof typeof contractErrorsEs.openZeppelin];
  }

  const haystack = [err.reason, err.shortMessage, err.message, String(error)]
    .filter((value): value is string => typeof value === "string")
    .join(" | ");
  const haystackLower = haystack.toLowerCase();

  for (const [reason, translation] of Object.entries(contractErrorsEs.custom)) {
    if (haystack.includes(reason)) return translation;
  }
  for (const [name, translation] of Object.entries(contractErrorsEs.openZeppelin)) {
    if (haystack.includes(name)) return translation;
  }
  for (const [pattern, translation] of Object.entries(contractErrorsEs.textPatterns)) {
    if (haystackLower.includes(pattern)) return translation;
  }

  const panicMatch = haystack.match(PANIC_CODE_PATTERN);
  if (panicMatch) {
    const code = panicMatch[1].toLowerCase() as keyof typeof contractErrorsEs.solidityPanics;
    if (contractErrorsEs.solidityPanics[code]) return contractErrorsEs.solidityPanics[code];
  }

  if (err.code && err.code in contractErrorsEs.generic) {
    return contractErrorsEs.generic[err.code as keyof typeof contractErrorsEs.generic];
  }

  return `${contractErrorsEs.default} "${rawMessageFrom(err, error)}"`;
}

function rawMessageFrom(err: TranslatableError, error: unknown): string {
  const raw = err.reason ?? err.shortMessage ?? err.message ?? String(error);
  const oneLine = raw.toString().replace(/\s+/g, " ").trim();
  return oneLine.length > RAW_MESSAGE_MAX_LENGTH
    ? `${oneLine.slice(0, RAW_MESSAGE_MAX_LENGTH)}…`
    : oneLine;
}
