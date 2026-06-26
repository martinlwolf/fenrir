# Implementation Plan: Frontend de Fenrir (client/)

**Branch**: `002-frontend-client` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-frontend-client/spec.md`

## Summary

Construir `client/`: la SPA de presentación de Fenrir, sobre el backend ya implementado
(`server/`, contrato en `specs/001-express-backend-server/contracts/openapi.md`) y los
contratos de forma de `shared/` (alias `@shared/*` ya configurado en `client/tsconfig.json`).

Arquitectura (determinada por el backend existente, no por esta feature):
- **Lecturas** → API REST pública del backend (espejo on-chain en PostgreSQL).
- **Escrituras on-chain** (invest/vote/declare/createProject/offer/claim) → firma directa
  con la wallet contra los contratos, usando **ethers v6** (`BrowserProvider` sobre
  `window.ethereum` + `ethers.Contract` con ABIs). Direcciones por proyecto desde la API
  (`address`/`tokenAddress`/`governorAddress`); `FenrirFactory` desde variable de entorno.
- **Escrituras off-chain** (reporte de hito, material de verificación) → backend,
  autenticadas por firma de wallet (`/auth/nonce` → `/auth/verify`, header
  `Authorization: Wallet <…>`).

Sin lógica de negocio en el cliente (Principio II): solo formato/campos requeridos con los
Zod de `shared/`. Entrega por slices P1→P5.

## Technical Context

**Language/Version**: TypeScript 5.7, React 18 (`.tsx`)

**Primary Dependencies**: Vite, Tailwind CSS, shadcn/ui (Radix), Axios (única instancia),
TanStack Query (server-state + polling), React Router, react-hook-form + Zod (de `shared/`),
**ethers v6** (provider/signer/Contract; sin wagmi). Contratos de forma vía `@shared/*`.

**Storage**: Sin storage propio. Server-state en memoria (TanStack Query). Sesión de firma
según el backend (header `Authorization: Wallet <…>`; el token/credencial se mantiene en
memoria, no en `localStorage`).

**Testing**: Vitest + React Testing Library; MSW para simular la API del backend en tests y
en el modo de desarrollo sin backend, devolviendo datos que validan contra los Zod de
`shared/`.

**Target Platform**: Navegador de escritorio con MetaMask (EIP-1193). Sin objetivo móvil.

**Project Type**: Web application (frontend SPA en `client/`, con `server/` y `shared/`
existentes).

**Performance Goals**: Catálogo/detalle percibidos como instantáneos (datos ya calculados
por el backend). Polling de propuestas/ofertas activas del orden de pocos segundos,
apagado cuando el recurso no está activo.

**Constraints**: Sin lógica de negocio en `client/`; una sola instancia de Axios; toda
llamada a la API en `services/`; UI solo shadcn/ui; tipos/enums/schemas importados de
`shared/` (nunca redefinir); ethers solo en la capa `lib/chain` (los componentes no usan
ethers directo); TS sin `any` injustificado; env desde `.env`.

**Scale/Scope**: ~5 flujos de rol, ~12–15 pantallas; volumen de demo de seminario.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple | Estado |
|---|---|---|
| **I. Separación on-chain/off-chain** | Lecturas desde la API del backend (espejo); la cadena solo se toca para firmar/enviar escrituras y leer recibos de tx, nunca para poblar la UI. | ✅ Pass |
| **II. Sin lógica de negocio en el frontend** | FR-024: ningún cálculo de montos/comisión/quórum/elegibilidad en `client/`; el contrato valida cada tx y la API ya entrega el estado resuelto. Validación solo de formato con Zod de `shared/`. | ✅ Pass |
| **III. Única fuente de verdad** | Una instancia de Axios en `lib/api.ts`; llamadas en `services/`; UI solo shadcn/ui; tipos/enums/Zod desde `shared/` (`@shared/*`). ethers aislado en `lib/chain/`. | ✅ Pass |
| **IV. Contratos fuente de verdad, deploy manual** | El frontend no compila ni despliega contratos; consume sus ABIs (artefacto) y direcciones (API/env) para firmar. No altera el pipeline manual de Remix. | ✅ Pass |
| **V. Tipado, configurado, nombrado** | TS estricto sin `any` injustificado; `.env` + `.env.example` (`VITE_API_URL`, `VITE_SEPOLIA_CHAIN_ID`, `VITE_FENRIR_FACTORY_ADDRESS`); vocabulario y enums del proyecto. | ✅ Pass |

**Resultado**: sin violaciones. No se requiere Complexity Tracking.

*Re-evaluación post-diseño (Phase 1)*: data-model, contracts y estructura mantienen los
cinco gates. ethers queda confinado a `lib/chain/` y `services/`, sin filtrarse a los
componentes. ✅

## Project Structure

### Documentation (this feature)

```text
specs/002-frontend-client/
├── plan.md, spec.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── api.md        # endpoints del backend que el frontend consume (subset de openapi.md)
│   └── chain.md      # interacción on-chain con ethers v6 (connect, sign, write)
└── checklists/requirements.md
```

### Source Code (repository root)

```text
client/
├── index.html, vite.config.ts, tsconfig.json (ya existe, alias @shared/*)
├── tailwind.config.ts, postcss.config.js, components.json
├── Dockerfile, .env.example
└── src/
    ├── main.tsx, App.tsx
    ├── routes/                # una pantalla por ruta
    ├── components/
    │   ├── ui/                # shadcn/ui
    │   ├── ui-custom/         # wrappers (AddressInput, etc.)
    │   └── domain/            # ProjectCard, MilestoneList, VotePanel, OfferCard…
    ├── services/              # única vía a la API (Axios) — 1 archivo por dominio
    │   ├── projects.service.ts, milestones.service.ts, reports.service.ts
    │   ├── proposals.service.ts, offers.service.ts, distribution.service.ts
    │   ├── investors.service.ts, developers.service.ts, auth.service.ts
    ├── hooks/                 # useProjects, useProposal (polling), useWallet, useSession, useWrite
    ├── lib/
    │   ├── api.ts             # ÚNICA instancia de Axios
    │   ├── queryClient.ts
    │   ├── chain/             # capa ethers v6 (aislada)
    │   │   ├── provider.ts    # BrowserProvider sobre window.ethereum, switchToSepolia
    │   │   ├── contracts.ts   # factories ethers.Contract (project/token/governor/factory)
    │   │   └── abis/          # ABIs JSON de FenrirFactory/Project/Token/Governor
    │   └── mock/              # MSW handlers contra los esquemas de shared/
    ├── providers/            # WalletProvider, QueryProvider, SessionProvider
    └── types/                # tipos de vista locales (no compartidos)
```

**Structure Decision**: frontend aislado en `client/`. Arquitectura por capas
(componentes → hooks → services → `lib/api.ts`) espejo del backend; ethers confinado en
`lib/chain/` y consumido solo por hooks/services de escritura, nunca por componentes. Los
contratos de forma se importan de `shared/` vía `@shared/*` (ya configurado).

## Complexity Tracking

> Sin violaciones a la constitución. Sección no aplicable.
