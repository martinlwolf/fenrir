// TEMP (Claude): poller que revisa la DB cada 5s buscando un proyecto con token "EPICO".
// Imprime una linea por chequeo y sale (exit 0) apenas aparece, o (exit 2) al timeout.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const INTERVAL_MS = 5000;
const MAX_MS = 20 * 60 * 1000;
const started = Date.now();
const ts = () => new Date().toISOString().slice(11, 19);

let n = 0;
async function check() {
  n++;
  const elapsed = Math.round((Date.now() - started) / 1000);
  const hit = await prisma.project.findFirst({
    where: {
      OR: [
        { tokenSymbol: { equals: 'EPICO', mode: 'insensitive' } },
        { tokenName: { contains: 'epico', mode: 'insensitive' } },
      ],
    },
    select: {
      address: true, tokenName: true, tokenSymbol: true,
      status: true, developerWallet: true, createdAt: true, createdAtBlock: true,
    },
  });

  if (hit) {
    console.log(`[${ts()}] check #${n} (+${elapsed}s) -> APARECIO! EPICO encontrado:`);
    console.log(JSON.stringify({ ...hit, createdAtBlock: String(hit.createdAtBlock) }, null, 2));
    await prisma.$disconnect();
    process.exit(0);
  }

  const total = await prisma.project.count();
  console.log(`[${ts()}] check #${n} (+${elapsed}s) -> sin EPICO aun. proyectos totales: ${total}`);

  if (Date.now() - started > MAX_MS) {
    console.log(`[${ts()}] timeout (${MAX_MS / 60000} min) sin ver EPICO. corto.`);
    await prisma.$disconnect();
    process.exit(2);
  }
}

console.log(`[${ts()}] poller iniciado. revisando cada ${INTERVAL_MS / 1000}s...`);
await check();
setInterval(() => { check().catch((e) => { console.error('error en check:', e); }); }, INTERVAL_MS);
