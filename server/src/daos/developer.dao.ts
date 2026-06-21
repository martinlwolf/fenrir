// DAO de developers: unica capa que toca Prisma para Developer.
import { Developer } from "../models/Developer";
import { prisma } from "./prisma";

export interface UpsertDeveloperInput {
  wallet: string;
  razonSocial: string;
  cuit: string;
  registeredAtBlock: bigint;
}

// Refleja DeveloperRegistered. La regla "1 wallet valida por CUIT" la impone el
// contrato (FR-015); el espejo simplemente persiste lo que el evento comunica.
export async function upsertFromRegistration(input: UpsertDeveloperInput): Promise<void> {
  const wallet = input.wallet.toLowerCase();
  await prisma.developer.upsert({
    where: { wallet },
    create: {
      wallet,
      razonSocial: input.razonSocial,
      cuit: input.cuit,
      registeredAtBlock: input.registeredAtBlock,
    },
    update: { razonSocial: input.razonSocial, cuit: input.cuit },
  });
}

export async function findByWallet(wallet: string): Promise<Developer | null> {
  const row = await prisma.developer.findUnique({ where: { wallet: wallet.toLowerCase() } });
  return row
    ? new Developer({
        wallet: row.wallet,
        razonSocial: row.razonSocial,
        cuit: row.cuit,
        verificationDocsUrl: row.verificationDocsUrl,
      })
    : null;
}

export async function setVerificationDocsUrl(wallet: string, url: string): Promise<void> {
  await prisma.developer.update({
    where: { wallet: wallet.toLowerCase() },
    data: { verificationDocsUrl: url },
  });
}

export async function getDeveloperWallet(projectAddress: string): Promise<string | null> {
  const row = await prisma.project.findUnique({
    where: { address: projectAddress.toLowerCase() },
    select: { developerWallet: true },
  });
  return row ? row.developerWallet : null;
}
