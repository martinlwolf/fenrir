// Utilidad manual para adelantar (o retroceder) el cursor de ingestion sin pasar por
// el ciclo de polling. Util cuando se redeploya un contrato y el cursor guardado queda
// apuntando a una zona de bloques irrelevante (ver server/src/ingestion/listener.ts).
//
// Uso: npx tsx --env-file=../.env scripts/set-ingestion-cursor.ts <ultimoBloqueProcesado>
// El proximo ciclo de polling arranca en <ultimoBloqueProcesado> + 1.
import { ingestionRepository } from "../src/persistence/repositories/ingestion.repository";
import { prisma } from "../src/persistence/repositories/prisma";

const SCOPE = "main"; // debe coincidir con el SCOPE de listener.ts

async function main(): Promise<void> {
  const raw = process.argv[2];
  if (!raw || !/^\d+$/.test(raw)) {
    console.error("Uso: npx tsx --env-file=../.env scripts/set-ingestion-cursor.ts <ultimoBloqueProcesado>");
    process.exit(1);
  }

  const block = BigInt(raw);
  const id = `sepolia:${SCOPE}`;
  await ingestionRepository.setCursor(id, block);
  console.log(`Cursor "${id}" actualizado a lastProcessedBlock=${block}. Proximo ciclo arranca en ${block + 1n}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
