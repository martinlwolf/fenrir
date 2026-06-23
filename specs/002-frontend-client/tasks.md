---
description: "Task list for Frontend de Fenrir (client/)"
---

# Tasks: Frontend de Fenrir (client/)

**Input**: Design documents from `specs/002-frontend-client/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/chain.md, quickstart.md

**Tests**: No se pidió TDD. Solo tareas de validación (quickstart) y unas pocas pruebas de
componentes en Polish.

**Organization**: por user story (P1→P5), cada una demostrable de forma independiente.

## Convenciones (de plan.md y skill frontend-developer)

- Una **única** instancia de Axios en `client/src/lib/api.ts`. Llamadas a la API solo en `client/src/services/`.
- UI solo shadcn/ui; wrappers en `components/ui-custom/` si shadcn no cubre.
- Tipos/enums/Zod se **importan de `shared/`** vía `@shared/*` (ya configurado); nunca duplicar.
- **ethers v6** confinado a `client/src/lib/chain/`; los componentes no importan ethers.
- Direcciones por proyecto desde la API; `FenrirFactory` desde `VITE_FENRIR_FACTORY_ADDRESS`.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Crear el scaffold de Vite + React 18 + TS en `client/` (`vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`) respetando el `client/tsconfig.json` y el alias `@shared/*` ya existentes
- [X] T002 [P] Configurar Tailwind en `client/tailwind.config.ts`, `client/postcss.config.js`, `client/src/index.css`
- [X] T003 [P] Inicializar shadcn/ui en `client/components.json` y crear `client/src/components/ui/`
- [X] T004 [P] Configurar ESLint + Prettier en `client/.eslintrc.cjs` y `client/.prettierrc` (sin `any` injustificado)
- [X] T005 [P] Crear `client/.env.example` (`VITE_API_URL`, `VITE_SEPOLIA_CHAIN_ID=11155111`, `VITE_FENRIR_FACTORY_ADDRESS`, `VITE_USE_MOCK`) y tipado en `client/src/vite-env.d.ts`
- [X] T006 [P] Agregar dependencias en `client/package.json`: `react`, `react-dom`, `react-router-dom`, `axios`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `ethers@^6`, `msw`, `vite`, `@vitejs/plugin-react`, `vitest`, `@testing-library/react`
- [X] T007 [P] Crear `client/Dockerfile` para build/serve de la SPA

**Checkpoint**: `pnpm dev` levanta una app vacía con Tailwind + shadcn.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: ninguna user story puede empezar hasta completar esta fase.

- [X] T008 Crear la **única** instancia de Axios en `client/src/lib/api.ts` (baseURL `VITE_API_URL`, manejo de `ApiError` `{ error, error_code, details? }` de `@shared/types/api`)
- [X] T009 [P] Configurar TanStack Query en `client/src/lib/queryClient.ts` y `client/src/providers/QueryProvider.tsx`
- [X] T010 Implementar la capa ethers en `client/src/lib/chain/provider.ts` (`BrowserProvider` sobre `window.ethereum`, `connect`, `getSigner`, `getChainId`, `switchToSepolia`, `signMessage`) según `contracts/chain.md` — sin exponer ethers fuera de `lib/chain`
- [X] T011 [P] Colocar las ABIs JSON en `client/src/lib/chain/abis/` (`FenrirFactory`, `FenrirProject`, `FenrirToken`, `FenrirGovernor`) y crear las factories `ethers.Contract` en `client/src/lib/chain/contracts.ts`
- [X] T012 Implementar `client/src/providers/WalletProvider.tsx` + `client/src/hooks/useWallet.ts` (cuenta/red, `isOnSepolia` vs `VITE_SEPOLIA_CHAIN_ID`, suscripción a `accountsChanged`/`chainChanged`) (FR-001, FR-002, FR-025) (depende de T010)
- [X] T013 [P] Implementar `client/src/services/auth.service.ts` (`POST /auth/nonce`, `POST /auth/verify`) usando los schemas de `@shared/schemas/auth.schema`
- [X] T014 Implementar `client/src/providers/SessionProvider.tsx` + `client/src/hooks/useSession.ts` (flujo nonce → `signMessage` → verify; interceptor de Axios que adjunta `Authorization: Wallet <…>` en rutas 🔒) (FR-004, D5) (depende de T010, T013)
- [X] T015 Implementar el hook de escritura on-chain `client/src/hooks/useWrite.ts` (llama funciones de `lib/chain`, `tx.wait(1)`, fases signing/mining/propagating/confirmed/failed, invalida queries) (FR-020, FR-021, D4) (depende de T010, T011)
- [X] T016 Configurar MSW en `client/src/lib/mock/` (`browser.ts`, `handlers/`) sirviendo las rutas de `contracts/api.md` con datos que validan contra `@shared/schemas/*`; activado por `VITE_USE_MOCK`
- [X] T017 Configurar React Router + layout raíz en `client/src/App.tsx` y `client/src/routes/`
- [X] T018 [P] Componentes transversales en `client/src/components/domain/`: `LoadingState.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `TxStatusBadge.tsx` (FR-020, FR-022)
- [X] T019 `client/src/components/domain/AppHeader.tsx`: conectar wallet, dirección, banner "red incorrecta → cambiar a Sepolia" (FR-001, FR-002) (depende de T012)
- [X] T020 [P] Agregar componentes base de shadcn/ui (`button`, `card`, `input`, `select`, `dialog`, `badge`, `table`, `form`, `tabs`, `skeleton`, `pagination`) en `client/src/components/ui/`
- [X] T021 [P] Util de formato `client/src/lib/format.ts` (wei↔ETH con `ethers.formatEther`/`parseEther`, fechas, direcciones cortas) — presentación pura

**Checkpoint**: wallet, red, Axios/Query/MSW/auth/ethers y el hook de escritura listos.

---

## Phase 3: User Story 1 — Explorar proyectos como lector (Priority: P1) 🎯 MVP

**Goal**: catálogo paginado/filtrable + detalle con fondeo, hitos y reportes, en solo lectura.

**Independent Test**: recorrer catálogo, filtrar por `type`/`status`, paginar, abrir detalle y la verificación de un reporte; forzar error de API.

- [X] T022 [P] [US1] `client/src/services/projects.service.ts` (`listProjects(query)`, `getProject(address)`) con `@shared/schemas/project.schema`
- [X] T023 [P] [US1] `client/src/services/milestones.service.ts` (`listMilestones(address)`)
- [X] T024 [P] [US1] `client/src/services/reports.service.ts` (`getReport(id)`, `getReportVerification(id)`) con `@shared/schemas/report.schema`
- [X] T025 [P] [US1] Hooks `client/src/hooks/useProjects.ts` y `client/src/hooks/useProject.ts`
- [X] T026 [P] [US1] MSW handlers de proyectos/hitos/reportes en `client/src/lib/mock/handlers/projects.ts`
- [X] T027 [US1] `client/src/components/domain/ProjectCard.tsx` (tipo, estado, `totalRaised` vs `ff`/`fmpa`) — reutilizable (regla de 2)
- [X] T028 [US1] `client/src/components/domain/ProjectFilters.tsx` (Select de `type`/`status`) + paginación
- [X] T029 [US1] Pantalla `client/src/routes/CatalogPage.tsx` (lista, filtros, paginación, loading/empty/error) (depende de T025, T027, T028)
- [X] T030 [P] [US1] `client/src/components/domain/MilestoneList.tsx` + `MilestoneItem.tsx` (estado, budget, deadline, retryCount, reporte URL+hash)
- [X] T031 [P] [US1] `client/src/components/domain/FundingSummary.tsx` + `ArbiterBadge.tsx` + `ReportVerificationBadge.tsx` (`hashMatch`)
- [X] T032 [US1] Pantalla `client/src/routes/ProjectDetailPage.tsx` (compone fondeo, hitos, direcciones, precios, rol del viewer) (depende de T025, T030, T031)

**Checkpoint**: lector de punta a punta contra la API real. MVP demostrable.

---

## Phase 4: User Story 2 — Conectar wallet e invertir (Priority: P2)

**Goal**: invertir en `Funding` firmando `invest()` y ver historial/claimable.

**Independent Test**: invertir un monto, firmar, ver `totalRaised`/historial; rechazar firma y recuperar estado.

- [X] T033 [P] [US2] `client/src/services/investors.service.ts` (`getInvestments(wallet)`, `getClaimable(wallet)`) con `@shared/schemas` (investment/sale)
- [X] T034 [P] [US2] Función de dominio `investInProject(projectAddress, amountWei)` en `client/src/lib/chain/contracts.ts` (`invest()` payable)
- [X] T035 [P] [US2] MSW handlers de inversores en `client/src/lib/mock/handlers/investors.ts`
- [X] T036 [US2] `client/src/components/domain/InvestDialog.tsx` (monto con Zod de `shared/`, dispara `useWrite`→`investInProject`, bloquea si red ≠ Sepolia o sin wallet) (FR-010) (depende de T015, T019)
- [X] T037 [US2] Integrar botón "Invertir" en `ProjectDetailPage.tsx` (visible solo si `Funding`; estado en progreso sin doble envío) (FR-010, FR-020)
- [X] T038 [US2] Pantalla `client/src/routes/MyPortfolioPage.tsx` (historial de inversión + reclamables `Refund`/`Distribution`) (FR-011) (depende de T033)

**Checkpoint**: US1 + US2; inversión firma directo contra el contrato.

---

## Phase 5: User Story 3 — Declarar hito y votar en el DAO (Priority: P3)

**Goal**: subir reporte + declarar hito on-chain; ver propuestas y votar (hito/árbitro/oferta).

**Independent Test**: subir reporte y declarar hito; votar una propuesta `Active` y ver conteo/deadline por polling.

- [X] T039 [P] [US3] `client/src/services/proposals.service.ts` (`listProposals(address)`, `getProposal(address,id)`, `getVotingPower(address,id,wallet)`, `getArbiter(address)`) con `@shared/schemas/proposal.schema`
- [X] T040 [P] [US3] Funciones de dominio en `lib/chain/contracts.ts`: `declareMilestone(projectAddress, reportHash, reportUrl)`, `castVote(governorAddress, proposalId, support)`, `castElectionVote(governorAddress, proposalId, candidate)`
- [X] T041 [P] [US3] Hook `client/src/hooks/useProposal.ts` con `refetchInterval` activo solo mientras `status === "Active"` (FR-023, D3)
- [X] T042 [P] [US3] MSW handlers de gobernanza en `client/src/lib/mock/handlers/proposals.ts`
- [X] T043 [US3] `client/src/components/domain/UploadReportDialog.tsx` (texto `createReportBodySchema` + media/docs multipart → `reports.service`; autenticado) y `DeclareMilestoneButton.tsx` (firma `declareMilestone` con el output) (FR-013) (depende de T014, T015)
- [X] T044 [US3] `client/src/components/domain/VotePanel.tsx` (deadline, quórum/umbral, conteo, poder de voto/`hasVoted`; votar `castVote`) (FR-014, FR-015) (depende de T015, T041)
- [X] T045 [US3] `client/src/components/domain/ArbiterElectionPanel.tsx` (candidatos → `castElectionVote`) (FR-015)
- [X] T046 [US3] Integrar UploadReport/Declare/VotePanel/ArbiterElection en `ProjectDetailPage.tsx`, reflejando `result`/`retryCount`/`status` por hito (FR-014)

**Checkpoint**: US1–US3; gobernanza con datos en vivo.

---

## Phase 6: User Story 4 — Identidad y reputación del developer (Priority: P4)

**Goal**: ver identidad + reputación (certificados) y subir material de verificación.

**Independent Test**: ver identidad/reputación de un developer; como ese developer, subir verificación.

- [X] T047 [P] [US4] `client/src/services/developers.service.ts` (`getDeveloper(wallet)`, `getReputation(wallet)`, `submitVerification(wallet, files)` 🔒) con `@shared/schemas/developer.schema`
- [X] T048 [P] [US4] Hook `client/src/hooks/useDeveloper.ts` (identidad + reputación de una wallet)
- [X] T049 [P] [US4] MSW handlers de developers en `client/src/lib/mock/handlers/developers.ts`
- [X] T050 [US4] `client/src/routes/DeveloperProfilePage.tsx` (razón social, CUIT, certificados `Completion`/`Failure`, conteos) (FR-018) (depende de T048)
- [X] T051 [US4] `client/src/components/domain/SubmitVerificationDialog.tsx` (subir material autenticado por firma; refleja resultado/error) (FR-019) (depende de T014)

**Checkpoint**: US1–US4; confianza pública sobre el developer.

---

## Phase 7: User Story 5 — Comprar y repartir la venta (Priority: P5)

**Goal**: comprador ve `Selling`, oferta firmando depósito; inversor reclama reparto.

**Independent Test**: vista comprador solo `Selling`; ofertar con depósito; venta ejecutada → reclamar reparto.

- [X] T052 [P] [US5] `client/src/services/offers.service.ts` (`listOffers(address)`) y `client/src/services/distribution.service.ts` (`getDistribution(address)`) con `@shared/schemas/sale.schema`
- [X] T053 [P] [US5] Funciones de dominio en `lib/chain/contracts.ts`: `submitOffer(projectAddress, amountWei)` (payable), `castDeveloperSaleVote(...)`, `claimDistribution(projectAddress)`, `claimRefund(projectAddress)`
- [X] T054 [P] [US5] Hook `client/src/hooks/useOffers.ts` con polling mientras haya ofertas `Voting`
- [X] T055 [P] [US5] MSW handlers de venta/reparto en `client/src/lib/mock/handlers/sale.ts`
- [X] T056 [US5] Vista comprador: `CatalogPage` usa `GET /projects/buyer-view` para el rol comprador (solo `Selling`) (FR-007, SC-006)
- [X] T057 [US5] `client/src/components/domain/MakeOfferDialog.tsx` (monto → `submitOffer` payable) y `OfferCard.tsx` (estado `Voting/Approved/Rejected/Refunded/Executed`) (FR-016) (depende de T015)
- [X] T058 [US5] `client/src/components/domain/SaleOffersPanel.tsx` (ofertas activas con VotePanel para votarlas) + `DistributionPanel.tsx` (`shares`/`claimable` → `claimDistribution`) (FR-016, FR-017) (depende de T044, T053)
- [X] T059 [US5] Botón "Reclamar reparto/refund" en `MyPortfolioPage.tsx` (según `claimable`) (FR-011, FR-017)

**Checkpoint**: las 5 user stories funcionan; ciclo de vida completo.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T060 [P] Crear proyecto (developer): `client/src/routes/CreateProjectPage.tsx` + `registerDeveloper`/`createProject` en `lib/chain` (firma contra el factory) (FR-012)
- [X] T061 [P] Manejo uniforme de rechazo/fallo de firma y reintento en `useWrite` y diálogos (FR-021); sin estados a medias
- [X] T062 [P] Reflejar cambios de cuenta/red sin recarga en toda la app (revisión `useWallet`/`useSession`) (FR-025)
- [X] T063 [P] Pruebas de componente (Vitest + RTL) para `ProjectCard`, `ProjectFilters`, `VotePanel` en `client/src/components/domain/__tests__/`
- [X] T064 Revisión de constitución: única instancia de Axios, ethers solo en `lib/chain`, imports desde `@shared/*` sin duplicar, sin cálculos de negocio (FR-024, FR-026)
- [ ] T065 Ejecutar la validación de `quickstart.md` (P1→P5) y registrar resultados

---

## Dependencies & Execution Order

- **Setup (P1)** → sin dependencias. **Foundational (P2)** depende de Setup y **bloquea** todo.
- **User Stories (P3–P7)** dependen de Foundational; luego en paralelo o en orden P1→P5.
- **Polish (P8)** depende de las stories deseadas. T060 (crear proyecto) reusa `lib/chain` + factory; puede adelantarse si se prioriza el alta de proyectos.

### Within each story

services → hooks → componentes → pantalla/integración. Las escrituras pasan siempre por `useWrite` + `lib/chain` (Foundational).

### Parallel Opportunities

- [P] en Setup/Foundational en paralelo.
- Dentro de cada story, services + hooks + funciones de `lib/chain` + MSW handlers ([P]) en paralelo; las pantallas dependen de ellos.
- Distintas stories se reparten entre personas una vez listo Foundational.

---

## Implementation Strategy

1. Setup → Foundational → US1 → **validar US1** → demo (lector).
2. Incremental: US2 → US3 → US4 → US5, validando cada slice.
3. Sin backend corriendo: `VITE_USE_MOCK=true` (MSW) para lecturas; las escrituras requieren wallet de Sepolia real o stub de `lib/chain`.
4. Commit por tarea o grupo lógico; frenar en cada checkpoint.
