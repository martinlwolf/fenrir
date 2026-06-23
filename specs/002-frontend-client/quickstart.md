# Quickstart — Frontend de Fenrir (client/)

Guía para correr y **validar** el frontend de punta a punta. El detalle de implementación
vive en `tasks.md`.

## Prerrequisitos

- Node.js 20+ y pnpm/npm.
- MetaMask en el navegador con la red **Sepolia** (chainId 11155111).
- `shared/` accesible vía alias `@shared/*` (ya configurado en `client/tsconfig.json`).
- Backend (`server/`) corriendo, o `VITE_USE_MOCK=true` para usar MSW.
- ABIs de los contratos en `client/src/lib/chain/abis/` y el `FenrirFactory` desplegado en
  Sepolia (dirección en `VITE_FENRIR_FACTORY_ADDRESS`).

## Setup

```bash
cd client
cp .env.example .env     # VITE_API_URL, VITE_SEPOLIA_CHAIN_ID, VITE_FENRIR_FACTORY_ADDRESS, VITE_USE_MOCK
pnpm install
pnpm dev
```

Variables de entorno (`.env`):

- `VITE_API_URL` — base de la API del backend (p.ej. `http://localhost:4000`).
- `VITE_SEPOLIA_CHAIN_ID` — `11155111`.
- `VITE_FENRIR_FACTORY_ADDRESS` — dirección del FenrirFactory desplegado.
- `VITE_USE_MOCK` — `true` para servir lecturas vía MSW sin backend.

## Comandos

```bash
pnpm dev          # desarrollo (Vite)
pnpm build        # build de producción (Vercel)
pnpm preview      # previsualizar el build
pnpm test         # Vitest + React Testing Library
pnpm typecheck    # tsc --noEmit (ya declarado en package.json)
pnpm lint         # ESLint
```

## Validación por slice (en orden de prioridad)

### P1 — Explorar como lector
1. Abrir la app **sin** wallet → catálogo (`GET /projects`) con tipo y estado; filtrar por
   `type`/`status` y paginar.
2. Abrir un detalle (`GET /projects/{address}`) → fondeo, hitos, reportes (`reportUrl` +
   `reportHash`), árbitro, precios.
3. Abrir la verificación de un reporte (`GET /reports/{id}/verification`) → `hashMatch`.
4. Forzar un error de API → estado de error claro, sin pantalla rota.

### P2 — Conectar wallet e invertir
1. Conectar MetaMask; en red ≠ Sepolia aparece el aviso de cambiar de red.
2. En un proyecto `Funding`, invertir un monto → firmar `invest()` (payable) → tras
   `tx.wait`, ver `totalRaised` e historial (`GET /investors/{wallet}/investments`)
   actualizados.
3. Rechazar la firma → vuelve al estado previo, permite reintentar.

### P3 — Declarar hito y votar
1. Como developer dueño autenticado por firma, subir reporte (`POST …/milestones/{i}/report`)
   → declarar el hito on-chain con `declareMilestone(reportHash, reportUrl)`.
2. Con FDT, sobre una propuesta `Active`, votar (`castVote`) → ver conteo y deadline
   actualizarse por polling.
3. Hito 0 / `ArbiterElection` → ver candidatos y votar (`castElectionVote`).

### P4 — Identidad y reputación del developer
1. Ver identidad (`GET /developers/{wallet}`) y reputación
   (`GET /developers/{wallet}/reputation`) con certificados.
2. Como ese developer, subir material de verificación (`POST …/verification`, autenticado).

### P5 — Compra y reparto
1. Como comprador, el catálogo usa `GET /projects/buyer-view` (solo `Selling`).
2. Ofertar con depósito → firmar `submitOffer()` (payable) → oferta `Voting`.
3. Venta ejecutada → reclamar (`claimDistribution()`) y ver la parte (`distribution.shares`).

## Notas de validación

- **Sin lógica de negocio**: ninguna cifra se calcula en el frontend; todas vienen de la API.
  ethers solo aparece dentro de `src/lib/chain/`.
- **Una sola instancia de Axios**: `src/lib/api.ts` es el único `axios.create()`.
- **`shared/`**: tipos/enums/Zod se importan de `@shared/*`, sin copias locales.
- Referencias: formas en `data-model.md`; endpoints en `contracts/api.md`; on-chain en
  `contracts/chain.md`.
