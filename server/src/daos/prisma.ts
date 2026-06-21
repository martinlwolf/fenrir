// Instancia unica del Prisma Client. Es la UNICA referencia a Prisma en todo el
// proyecto: ningun archivo fuera de daos/ debe importar @prisma/client
// (constitution Principio III + skill backend-architecture).
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
