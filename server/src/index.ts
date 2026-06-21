// Bootstrap del backend: levanta el servidor HTTP y arranca el listener de eventos
// on-chain (que corre dentro del propio backend, constitution Principio I).
import { env } from "./config/env";
import { buildApp } from "./app";
import { startListener, stopListener } from "./blockchain/listener";
import { prisma } from "./daos/prisma";

async function main(): Promise<void> {
  const app = buildApp();

  const server = app.listen(env.PORT, () => {
    console.log(`[fenrir] backend escuchando en http://localhost:${env.PORT}`);
    console.log(`[fenrir] docs en http://localhost:${env.PORT}/docs`);
  });

  startListener();

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[fenrir] recibido ${signal}, cerrando...`);
    stopListener();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
