// Logger unico del backend (pino), configurado desde .env (constitution Principio V).
// El resto del codigo importa `logger` (o `logger.child(...)`) desde aca y nunca usa
// `console.*` ni instancia pino por su cuenta. El nivel y el formato salen de las vars
// LOG_LEVEL / LOG_PRETTY.
import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.LOG_LEVEL,
  // En desarrollo, LOG_PRETTY=true usa pino-pretty para salida legible; en produccion
  // se emite JSON de una linea (mejor para los logs agregados de Render).
  transport: env.LOG_PRETTY
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss.l",
          ignore: "pid,hostname",
          singleLine: false,
          errorLikeObjectKeys: ["err", "error"],
        },
      }
    : undefined,
});
