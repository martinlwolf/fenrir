---
description: "Task list for Fenrir backend (Express + on-chain mirror)"
---

# Tasks: Servidor backend de Fenrir (API + espejo on-chain)

**Input**: Design documents from `/specs/001-express-backend-server/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.md, quickstart.md

**Tests**: Se incluye un set acotado de tests para los flujos correctness-critical (verificación de hash de reportes e ingestión idempotente), difíciles de validar a mano en la demo. El resto se valida vía `quickstart.md`.

**Organization**: Tareas agrupadas por user story para implementación y testeo independientes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: User story a la que pertenece (US1–US5)
- Rutas exactas en cada descripción. Base del backend: `server/`

## Path Conventions

- Backend: `server/src/...`, schema Prisma en `server/prisma/schema.prisma`
- Contratos de shape compartidos: `shared/schemas/`, `shared/constants/`, `shared/types/`
- ABIs de contratos: `server/src/blockchain/abis/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto y estructura base

- [x] T001 Crear estructura de carpetas de `server/src/` (controllers, services, models, daos, middlewares, exceptions, schemas, routes, blockchain, storage, config, docs) y `shared/` (schemas, constants, types) según `plan.md`
- [x] T002 Inicializar `server/package.json` (Node 20, type module/commonjs) con dependencias: express, prisma, @prisma/client, ethers, zod, @asteasolutions/zod-to-openapi, swagger-ui-express, multer, siwe; devDeps: typescript, tsx, vitest, supertest, @types/*
- [x] T003 [P] Crear `server/tsconfig.json` en modo strict (sin `any` implícito), con paths a `shared/`
- [x] T004 [P] Configurar lint/format (eslint + prettier) en `server/`
- [x] T005 [P] Crear `server/.env.example` con todas las variables de `quickstart.md` (PORT, DATABASE_URL, DIRECT_URL, SEPOLIA_RPC_URL, SEPOLIA_CHAIN_ID, FENRIR_FACTORY_ADDRESS, INGESTION_START_BLOCK, REPORT_STORAGE_DRIVER, REPORT_STORAGE_LOCAL_DIR)
- [x] T006 [P] Crear `server/Dockerfile` (multi-stage, build TS → runtime) y agregar servicios `server` + `postgres` a `docker-compose.yml` en la raíz

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura núcleo que DEBE estar lista antes de cualquier user story

**⚠️ CRITICAL**: Ningún trabajo de user story puede empezar hasta completar esta fase

- [x] T007 Definir `server/prisma/schema.prisma`: datasource con `url` (pooled) + `directUrl` (directo); todos los enums y modelos de `data-model.md` (Developer, Project, Milestone, MilestoneReport, Investment, Proposal, Vote, SaleOffer, ReputationCertificate, Claim, IngestionCursor, ProcessedEvent, AuthNonce) con montos wei como `Decimal` y claves únicas indicadas
- [x] T008 Generar la migración inicial y el Prisma Client (`prisma migrate dev`); crear `server/src/daos/prisma.ts` (instancia única del client) — única referencia a Prisma del proyecto
- [x] T009 [P] Implementar `server/src/config/env.ts`: lectura+validación de `.env` con Zod (fail-fast), exportando un objeto `env` tipado
- [x] T010 [P] Implementar `server/src/exceptions/FenrirException.ts` y `server/src/exceptions/common.ts` (BadRequest/NotFound/Unauthorized/Forbidden/Conflict) según skill backend-architecture
- [x] T011 [P] Implementar `server/src/middlewares/errorHandler.ts` (mapea FenrirException y ZodError → respuesta uniforme `{error,error_code,details}`) y `server/src/middlewares/responseFormat.ts`
- [x] T012 [P] Definir constantes de shape compartidas en `shared/constants/` (enums de estado espejando contratos: ProjectStatus, MilestoneStatus, OfferStatus, ProposalKind, etc.) — sin lógica de negocio
- [x] T013 Implementar `server/src/blockchain/provider.ts` (provider ethers desde `env`, con reconexión) y copiar los ABIs de los 4 contratos a `server/src/blockchain/abis/` (FenrirFactory, FenrirProject, FenrirToken, FenrirGovernor)
- [x] T014 Implementar el núcleo de ingestión idempotente en `server/src/services/ingestion.service.ts` + `server/src/daos/ingestion.dao.ts`: cursor (`IngestionCursor`), dedup por `(txHash, logIndex)` vía `ProcessedEvent`, y un wrapper `applyOnce(event, handler)` que ignora eventos ya procesados
- [x] T015 Implementar `server/src/blockchain/listener.ts`: backfill con `queryFilter` desde el cursor + suscripción en vivo; descubrimiento de project/token/governor a partir del evento `ProjectCreated`; avance del cursor solo sobre bloques confirmados (resistencia a reorg)
- [x] T016 [P] Implementar la interfaz `server/src/storage/ReportStorage.ts` y la impl inicial `server/src/storage/StorageLocal.ts` (filesystem desde `env`), seleccionable por `REPORT_STORAGE_DRIVER`
- [x] T017 Construir la app en `server/src/app.ts` (Express, JSON, middlewares base, montaje de rutas, `/health`, `/docs`) y el bootstrap `server/src/index.ts` (arranca HTTP + listener)
- [x] T018 [P] Configurar OpenAPI desde Zod en `server/src/docs/openapi.ts` y servir Swagger UI en `/docs`

**Checkpoint**: Fundación lista — las user stories pueden empezar

---

## Phase 3: User Story 1 - Catálogo y estado de proyectos (Priority: P1) 🎯 MVP

**Goal**: Catálogo y detalle de proyectos reflejando el estado on-chain, sin que el cliente lea la blockchain. Incluye vista de comprador (solo `Selling`).

**Independent Test**: Crear+fondear un proyecto on-chain y verificar catálogo/detalle vía API ≤30s, y que la vista de comprador excluye no-`Selling`.

### Tests for User Story 1 ⚠️

- [x] T019 [P] [US1] Test de ingestión idempotente en `server/src/__tests__/ingestion.test.ts`: aplicar el mismo `ProjectCreated`/`Invested` dos veces no duplica filas (cubre FR-005/SC-005)

### Implementation for User Story 1

- [x] T020 [P] [US1] Models `server/src/models/Project.ts` y `server/src/models/Investment.ts` (objetos de negocio; sin queries)
- [x] T021 [P] [US1] DAOs `server/src/daos/project.dao.ts` e `server/src/daos/investment.dao.ts` (mapean filas Prisma ↔ models; única capa con Prisma)
- [x] T022 [US1] Handlers de eventos en `server/src/blockchain/handlers/project.handlers.ts` para `ProjectCreated`, `Invested`, `FundingRoundClosed`, `ProjectCancelled` → upsert vía DAOs usando `applyOnce`
- [x] T023 [US1] `server/src/services/project.service.ts`: listar (paginado + filtros type/status), detalle con fondeo+hitos, y vista de comprador (filtro `Selling`)
- [x] T024 [P] [US1] Zod schemas de request/response del catálogo en `shared/schemas/project.schema.ts` (reusables por client/)
- [x] T025 [US1] Controller `server/src/controllers/project.controller.ts` (thin) + rutas `server/src/routes/project.routes.ts` para `GET /projects`, `GET /projects/buyer-view`, `GET /projects/{address}`, `GET /projects/{address}/milestones`
- [x] T026 [US1] Endpoint `GET /investors/{wallet}/investments` (controller + service + ruta) reflejando inversiones por wallet

**Checkpoint**: US1 funcional e independientemente testeable (catálogo + detalle + vista comprador + inversiones)

---

## Phase 4: User Story 2 - Reportes de hito con hash verificable (Priority: P1)

**Goal**: El developer sube el reporte completo; el backend devuelve hash SHA-256 + URL, lo sirve, y verifica el hash contra el on-chain.

**Independent Test**: Subir reporte → obtener hash+URL → declarar on-chain con ese hash → `verification` da `hashMatch=true`; GET del reporte sin auth.

### Tests for User Story 2 ⚠️

- [x] T027 [P] [US2] Test de hashing canónico en `server/src/__tests__/reportHash.test.ts`: el mismo contenido produce el mismo SHA-256; detecta mismatch (cubre FR-009/SC-002)

### Implementation for User Story 2

- [x] T028 [US2] Auth por wallet: `server/src/daos/authNonce.dao.ts`, `server/src/services/auth.service.ts` (nonce + verificación de firma con ethers) y `server/src/middlewares/walletAuth.ts` (adjunta `req.wallet`)
- [x] T029 [US2] Middleware de rol `server/src/middlewares/requireDeveloper.ts` (verifica que `req.wallet` esté registrada como developer, reflejado de `DeveloperRegistered`)
- [x] T030 [P] [US2] Model `server/src/models/Milestone.ts` y `server/src/models/MilestoneReport.ts` (incluye el cálculo del manifest canónico + SHA-256)
- [x] T031 [P] [US2] DAOs `server/src/daos/milestone.dao.ts` y `server/src/daos/report.dao.ts`
- [x] T032 [US2] `server/src/services/report.service.ts`: guardar reporte vía `ReportStorage`, calcular hash, devolver `{reportUrl, reportHash}`; y verificación on-chain vs. computado
- [x] T033 [US2] Handlers `server/src/blockchain/handlers/milestone.handlers.ts` para `MilestoneDeclared` (enlaza reporte ↔ milestone, setea `onChainHash`/`hashMatch`), `MilestoneVotingOpened/Paused`, `MilestoneApproved`, `MilestoneRejected`, `TrancheReleased`
- [x] T034 [US2] Endpoints auth (`POST /auth/nonce`, `POST /auth/verify`) y de reportes (`POST /projects/{address}/milestones/{index}/report` con multer, `GET /reports/{id}`, `GET /reports/{id}/verification`): controllers + rutas + schemas (internos en `server/src/schemas/`, compartidos en `shared/schemas/`)

**Checkpoint**: US1 + US2 funcionando de forma independiente

---

## Phase 5: User Story 3 - Gobernanza y poder de voto (Priority: P2)

**Goal**: Reflejar propuestas (elección de árbitro, hito, oferta de venta), quórum/umbral, resultado, y poder de voto por wallet en el snapshot.

**Independent Test**: Abrir una votación on-chain, votar con dos wallets, ver quórum/conteo/resultado y voting-power vía API.

### Implementation for User Story 3

- [x] T035 [P] [US3] Models `server/src/models/Proposal.ts` y `server/src/models/Vote.ts`
- [x] T036 [P] [US3] DAOs `server/src/daos/proposal.dao.ts` y `server/src/daos/vote.dao.ts`
- [x] T037 [US3] Handlers `server/src/blockchain/handlers/governance.handlers.ts` para `ProposalCreated`, `VoteCast`, `ProposalExtended`, `ProposalAwaitingArbiter`, `ProposalResolved`, `ArbiterElected`, `ArbiterVacated`
- [x] T038 [US3] `server/src/services/governance.service.ts`: listar/detallar propuestas con quórum/umbral; estado del árbitro; voting-power vía lectura `getPastVotes(account, snapshotBlock)` (read-only on-chain en el service)
- [x] T039 [US3] Endpoints (`GET /projects/{address}/proposals`, `GET .../proposals/{id}`, `GET .../proposals/{id}/voting-power`, `GET .../arbiter`): controller + rutas + schemas en `shared/schemas/proposal.schema.ts`

**Checkpoint**: US1–US3 independientes

---

## Phase 6: User Story 4 - Identidad y reputación del developer (Priority: P2)

**Goal**: Exponer identidad (razón social, CUIT) + material de verificación y el historial de certificados (finalización/fallido) por wallet.

**Independent Test**: Registrar developer, llevar 2 proyectos a desenlaces distintos, ver ambos certificados enlazados a su proyecto.

### Implementation for User Story 4

- [x] T040 [P] [US4] Models `server/src/models/Developer.ts` y `server/src/models/ReputationCertificate.ts`
- [x] T041 [P] [US4] DAOs `server/src/daos/developer.dao.ts` y `server/src/daos/certificate.dao.ts`
- [x] T042 [US4] Handlers `server/src/blockchain/handlers/developer.handlers.ts` para `DeveloperRegistered` (refleja regla 1-wallet-por-CUIT) y los mint de certificados (Completion/Failure) enlazados a su proyecto de origen
- [x] T043 [US4] `server/src/services/developer.service.ts`: identidad, subir material de verificación off-chain (vía `ReportStorage`), y reputación agregada
- [x] T044 [US4] Endpoints (`GET /developers/{wallet}`, `GET /developers/{wallet}/reputation`, `POST /developers/{wallet}/verification` con walletAuth): controller + rutas + schemas en `shared/schemas/developer.schema.ts`

**Checkpoint**: US1–US4 independientes

---

## Phase 7: User Story 5 - Ofertas de compra y cierre de venta (Priority: P3)

**Goal**: Exponer ofertas de venta y, tras ejecutar la venta, precio final + pool de reparto + reclamable por inversor. Reflejar reclamos.

**Independent Test**: Proyecto Investment en venta, 2 ofertas aprobadas, ejecutar la mayor; API muestra ganadora `Executed`, perdedora `Refunded`, y distribución por inversor.

### Implementation for User Story 5

- [x] T045 [P] [US5] Models `server/src/models/SaleOffer.ts` y `server/src/models/Claim.ts`
- [x] T046 [P] [US5] DAOs `server/src/daos/saleOffer.dao.ts` y `server/src/daos/claim.dao.ts`
- [x] T047 [US5] Handlers `server/src/blockchain/handlers/sale.handlers.ts` para `SaleStageOpened`, `SaleOfferSubmitted`, `SaleOfferApproved`, `SaleOfferRefunded`, `SaleExecuted`, `ProjectCompleted`, `RefundClaimed`, `DistributionClaimed`, `CommissionClaimed`
- [x] T048 [US5] `server/src/services/sale.service.ts`: ofertas por proyecto; distribución (precio final, pool, parte reclamable por inversor); y `claimable` por wallet (refund/distribution)
- [x] T049 [US5] Endpoints (`GET /projects/{address}/offers`, `GET /projects/{address}/distribution`, `GET /investors/{wallet}/claimable`): controller + rutas + schemas en `shared/schemas/sale.schema.ts`

**Checkpoint**: Las 5 user stories funcionan de forma independiente

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales a todas las stories

- [x] T050 [P] Completar la doc OpenAPI de todos los endpoints en `/docs` y verificar que se genera desde los Zod schemas (sin definiciones duplicadas)
- [x] T051 [P] Endpoint `GET /health` reportando estado del listener (último bloque procesado del `IngestionCursor`)
- [x] T052 Revisión de capas (checklist backend-architecture): ningún controller importa DAO/Prisma; ninguna query fuera de `daos/`; sin lógica de negocio en `shared/`
- [x] T053 [P] README de `server/` con setup y referencia a `quickstart.md`
- [ ] T054 Ejecutar la validación end-to-end de `quickstart.md` (escenarios 1–8) contra Sepolia — requiere Postgres corriendo, RPC de Sepolia y los contratos desplegados vía Remix (intervención humana)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las user stories
- **User Stories (Phase 3–7)**: dependen de Foundational; entre sí son independientes (se pueden encarar en paralelo o por prioridad P1→P3)
- **Polish (Phase 8)**: depende de las stories deseadas completas

### User Story Dependencies

- **US1 (P1)**: solo Foundational
- **US2 (P1)**: solo Foundational (auth por wallet se introduce acá; US1 no la necesita)
- **US3 (P2)**: solo Foundational; consume Project ya reflejado pero es testeable de forma independiente
- **US4 (P2)**: solo Foundational
- **US5 (P3)**: solo Foundational; usa Project en estado `Selling`

### Within Each User Story

- Tests (donde los hay) antes de la implementación
- Models → DAOs → handlers/services → controllers/rutas

### Parallel Opportunities

- Setup: T003, T004, T005, T006 en paralelo
- Foundational: T009, T010, T011, T012, T016, T018 en paralelo (tras T007/T008)
- Dentro de cada story, los `[P]` de models/DAOs/schemas en paralelo
- Con equipo, US1–US5 en paralelo tras Foundational

---

## Parallel Example: User Story 1

```bash
# Models y DAOs de US1 en paralelo:
Task: "Model Project en server/src/models/Project.ts"
Task: "Model Investment en server/src/models/Investment.ts"
Task: "DAOs project/investment en server/src/daos/"
Task: "Zod schemas de catálogo en shared/schemas/project.schema.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 (Setup) → Phase 2 (Foundational)
2. Phase 3 (US1: catálogo/espejo) → validar
3. Phase 4 (US2: reportes con hash) → validar
4. **STOP & DEMO**: ya hay espejo on-chain + el flujo de confianza híbrida (hash verificable), que es el corazón del proyecto

### Incremental Delivery

Setup+Foundational → US1 → US2 → US3 → US4 → US5 → Polish. Cada story agrega valor sin romper las anteriores.

---

## Notes

- `[P]` = archivos distintos, sin dependencias
- El backend NUNCA firma transacciones por el usuario ni recalcula reglas que ya viven en los contratos (FR-020): los handlers solo persisten lo que el evento comunica
- Toda query vive en un DAO; `shared/` solo lleva shape/format
- Commit después de cada tarea o grupo lógico
