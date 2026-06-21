# Fenrir — Backend (server)

API REST + espejo on-chain de Fenrir. Escucha los eventos de los contratos en
[`/contracts`](../contracts) (FenrirFactory, FenrirProject, FenrirToken, FenrirGovernor)
vía ethers.js y mantiene una copia consultable del estado en PostgreSQL (Prisma). El
frontend consume esta API y **nunca** lee la blockchain directamente.

Arquitectura, decisiones y validación end-to-end:
[`specs/001-express-backend-server/`](../specs/001-express-backend-server) — `plan.md`,
`research.md`, `data-model.md`, `contracts/openapi.md` y `quickstart.md`.

## Arquitectura en capas

`routes → controllers (thin) → services → models / persistence (repositories)`, más
`middlewares`, `exceptions` (FenrirException centralizada), `models/onchain` (provider,
ABIs, enums), `ingestion` (listener + handlers + sincronización on-chain) y `storage`
(interfaz `ReportStorage` + impl local). La capa de datos se llama **repositorio**
(`persistence/repositories/`), no "DAO" — "DAO" nombra al órgano de gobernanza on-chain.
Reglas: toda query vive en un repositorio (única capa que toca Prisma); el backend
**no** recalcula reglas de negocio que ya viven en los contratos — solo refleja y reporta.

## Stack

Express + TypeScript (strict), Prisma + PostgreSQL (datasource `url` pooled +
`directUrl` directo), Zod, ethers v6, multer, swagger-ui-express. Schemas/constantes/
tipos compartidos con el frontend viven en [`../shared`](../shared).

## Puesta en marcha (local)

```bash
docker compose up -d postgres     # desde la raíz del repo
cd server
cp .env.example .env              # completar SEPOLIA_RPC_URL y FENRIR_FACTORY_ADDRESS
npm install
npx prisma migrate dev            # crea el schema (usa DIRECT_URL)
npm run dev                       # Express + listener de eventos
```

- API: `http://localhost:4000`
- Docs (Swagger): `http://localhost:4000/docs`
- Health (incluye último bloque procesado): `http://localhost:4000/health`

Todo en contenedores: `docker compose up --build` desde la raíz.

## Ingestión de eventos

El listener (en `src/blockchain/listener.ts`) hace polling del rango
`[cursor+1 .. head − confirmaciones]`, parsea los logs de factory + proyectos +
governors y los despacha a sus handlers a través de `applyOnce` (idempotente, dedup por
`(txHash, logIndex)`). Una desconexión o un atraso se recuperan solos en el siguiente
ciclo, sin perder ni duplicar eventos.

## Auth (endpoints de escritura)

Por firma de wallet, sin passwords: `POST /auth/nonce` → firmar el mensaje → enviar
`x-wallet-address` + `x-wallet-signature` en las requests protegidas (subir reporte de
hito, subir verificación de developer).

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor + listener con recarga |
| `npm run build` | Compila a `dist/` (tsc + tsc-alias) |
| `npm start` | Corre `dist/` |
| `npm run typecheck` | Type-check sin emitir |
| `npm test` | Tests (Vitest) |
| `npm run prisma:migrate` | Migraciones de desarrollo |

## Validación end-to-end

Ver los 8 escenarios de [`quickstart.md`](../specs/001-express-backend-server/quickstart.md)
(catálogo, inversión, vista de comprador, reporte + hash, gobernanza, reputación, venta
y reparto, resiliencia del listener).
