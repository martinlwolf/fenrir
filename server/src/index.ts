// Bootstrap del backend: levanta el servidor HTTP y arranca el listener de eventos
// on-chain (que corre dentro del propio backend, constitution Principio I).
import { buildApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { onChainListener } from "./ingestion/listener";
import { prisma } from "./persistence/repositories/prisma";

async function main(): Promise<void> {
  const app = buildApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`backend escuchando en http://localhost:${env.PORT}`);
    logger.info(`docs en http://localhost:${env.PORT}/docs`);
  });

  onChainListener.start();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`recibido ${signal}, cerrando...`);
    onChainListener.stop();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
