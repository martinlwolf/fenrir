#!/usr/bin/env node
// PostToolUse hook (Edit|Write): recuerda revisar shared/chain/contract-errors.es.json
// cada vez que se toca un contrato Solidity en contracts/src/. Los require()/custom error
// nuevos o modificados ahi necesitan su traduccion al espanol en ese diccionario (ver
// shared/chain/translateContractError.ts).
let data = "";
process.stdin.on("data", (chunk) => {
  data += chunk;
});
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(data);
  } catch {
    return;
  }

  const filePath = input?.tool_input?.file_path ?? input?.tool_response?.filePath ?? "";
  const normalized = filePath.replace(/\\/g, "/");
  if (!/contracts\/src\/.*\.sol$/.test(normalized)) return;

  const message =
    "Se editó un contrato Solidity en contracts/src/. Si agregaste o modificaste un " +
    "require()/custom error, actualizá shared/chain/contract-errors.es.json con su " +
    "traducción al español correspondiente (ver shared/chain/translateContractError.ts).";

  process.stdout.write(
    JSON.stringify({
      systemMessage: message,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: message,
      },
    }),
  );
});
