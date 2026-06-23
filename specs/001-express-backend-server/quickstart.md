# Quickstart: Backend de Fenrir

Guía de arranque y validación end-to-end del backend. No reemplaza a `tasks.md`; sirve para correr y verificar la feature.

## Prerrequisitos

- Node.js 20 LTS
- Docker + Docker Compose (para Postgres local)
- Un endpoint RPC de Sepolia (Alchemy/Infura) y las direcciones de la `FenrirFactory` desplegada vía Remix
- ABIs de los contratos exportados a `server/src/blockchain/abis/`

## Variables de entorno (`server/.env`)

Copiar `server/.env.example` → `server/.env` y completar:

```
PORT=4000
DATABASE_URL=postgresql://...      # pooled (runtime)
DIRECT_URL=postgresql://...        # directo (migraciones Prisma)
SEPOLIA_RPC_URL=...                # RPC (https o wss)
SEPOLIA_CHAIN_ID=11155111
FENRIR_FACTORY_ADDRESS=0x...       # ancla; los demás contratos se descubren por evento
INGESTION_START_BLOCK=...          # bloque de despliegue del factory (para el backfill inicial)
REPORT_STORAGE_DRIVER=local        # local | (futuro) supabase
REPORT_STORAGE_LOCAL_DIR=./.data/reports
```

`config/env.ts` valida estas variables con Zod al arrancar (fail-fast si falta alguna).

## Arranque local

```bash
docker compose up -d postgres      # levanta Postgres
cd server
npm install
npx prisma migrate dev             # aplica el schema (usa DIRECT_URL)
npm run dev                        # Express + listener de eventos
```

O todo en contenedores:

```bash
docker compose up --build          # server + postgres
```

## Escenarios de validación

### 1. Espejo de catálogo (US1)
1. Crear un proyecto on-chain vía `FenrirFactory.createProject(...)` en Remix.
2. Esperar la confirmación del evento `ProjectCreated`.
3. `GET /projects` → el proyecto aparece con su `type`, `status=Funding`, `totalRaised=0`.
   - **Esperado**: ≤ 30 s desde la confirmación (SC-001).

### 2. Inversión reflejada (US1)
1. Invertir on-chain con una wallet (`FenrirProject.invest()`).
2. `GET /projects/{address}` → `totalRaised` aumentó; `GET /investors/{wallet}/investments` lista el aporte.

### 3. Vista de comprador (US1/US5)
1. `GET /projects/buyer-view` con un proyecto en `Funding`.
   - **Esperado**: NO aparece (solo `Selling`) (SC-003).

### 4. Reporte de hito y hash (US2)
1. Auth por firma de wallet del developer.
2. `POST /projects/{address}/milestones/{index}/report` con texto + un archivo.
   - **Esperado**: respuesta `{ reportUrl, reportHash }`.
3. Declarar el hito on-chain usando ese `reportHash` y `reportUrl`.
4. Tras el evento `MilestoneDeclared`: `GET /reports/{reportId}/verification` → `hashMatch=true` (SC-002).
5. `GET /reports/{reportId}` → devuelve el contenido sin auth.

### 5. Gobernanza (US3)
1. Con un hito en votación on-chain, votar con dos wallets.
2. `GET /projects/{address}/proposals/{id}` → quórum y conteo actualizados.
3. `GET /.../voting-power?wallet=` → poder en el snapshot + `hasVoted`.

### 6. Reputación del developer (US4)
1. Llevar un proyecto a `Completed` y otro a `Cancelled`.
2. `GET /developers/{wallet}/reputation` → un Certificado de Finalización y uno de Proyecto Fallido, cada uno con su `projectAddress`.

### 7. Venta y reparto (US5)
1. Proyecto Investment en `Selling`; enviar dos ofertas on-chain, aprobarlas, ejecutar la mayor.
2. `GET /projects/{address}/offers` → la perdedora `Refunded`, la ganadora `Executed`.
3. `GET /projects/{address}/distribution` → precio final + parte reclamable por inversor.

### 8. Resiliencia del listener (SC-005)
1. Detener el server unos minutos mientras ocurren eventos on-chain.
2. Reiniciarlo.
   - **Esperado**: el backfill reprocesa desde el `IngestionCursor` sin duplicar (dedup por `(txHash, logIndex)`); el estado converge al on-chain.

## Tests

```bash
cd server
npm test            # vitest: unit (models/services) + supertest (endpoints) + listener con eventos simulados
```
