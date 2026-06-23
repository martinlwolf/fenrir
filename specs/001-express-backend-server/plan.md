# Implementation Plan: Servidor backend de Fenrir (API + espejo on-chain)

**Branch**: `001-express-backend-server` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-express-backend-server/spec.md`

## Summary

Construir el backend de Fenrir en Express + TypeScript como un servicio híbrido que (1) escucha los eventos on-chain de los cuatro contratos en `/contracts` vía ethers.js y mantiene un espejo consultable en PostgreSQL (vía Prisma), y (2) expone una API REST que el frontend consume sin tocar la blockchain. El backend nunca firma transacciones por el usuario ni recalcula reglas que ya viven en los contratos; solo refleja estado y, para los reportes de hito, prepara y sirve el contenido off-chain con su hash SHA-256 verificable contra el `reportHash` on-chain. Se respeta la arquitectura en capas (Thin Controllers → Services → Models/DAOs, Middlewares, FenrirException centralizada) de `backend-architecture` y la constitución.

## Technical Context

**Language/Version**: TypeScript 5.x (strict) sobre Node.js 20 LTS

**Primary Dependencies**: Express 5, Prisma 6 (PostgreSQL), ethers.js v6, Zod, `@asteasolutions/zod-to-openapi` + `swagger-ui-express`, `siwe`/verificación de firma con ethers para auth por wallet, `multer` para uploads de reportes

**Storage**: PostgreSQL (vía Prisma, `url` pooled + `directUrl` directo). Reportes de hito (texto/medios/docs) detrás de una interfaz `ReportStorage`; implementación inicial filesystem local (`StorageLocal`), intercambiable a futuro sin tocar services.

**Testing**: Vitest (unit de models/services con DAOs y blockchain mockeados) + supertest para tests de endpoints. Tests de integración del listener con eventos simulados.

**Target Platform**: Linux server (contenedor Docker), desplegado en Render; red on-chain Sepolia (testnet) vía RPC.

**Project Type**: Web service (backend de una app web con `client/` y `shared/` hermanos en el monorepo).

**Performance Goals**: Demo universitaria, no producción. Reflejar un evento on-chain en el espejo en < 30 s desde su confirmación (SC-001). Respuestas de lectura de la API < 300 ms p95 con el dataset de la demo.

**Constraints**: Acceso a datos SOLO vía Prisma (sin SQL crudo ni segundo ORM). El frontend NUNCA lee on-chain directo. Ingestión de eventos idempotente y resistente a reconexión/reorg (cursor de último bloque procesado). Config solo desde `.env` (+ `.env.example`). `shared/` solo lleva shape/format, nunca lógica de negocio.

**Scale/Scope**: Decenas de proyectos, cientos de inversores, miles de eventos on-chain en total — escala de seminario. Sin requisitos de alta concurrencia.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple este plan | Estado |
|---|---|---|
| I. Separación On-chain/Off-chain | El listener (parte del propio backend) consume eventos y persiste un espejo en PostgreSQL; el frontend lee solo la API. Reportes de hito off-chain servidos por URL con hash que debe coincidir con el on-chain. | ✅ |
| II. Sin lógica de negocio en el frontend | El backend espeja y reporta; no recalcula umbrales/penalización/tranches (FR-020). `shared/` solo lleva Zod schemas/constantes/tipos de shape. | ✅ |
| III. Single source of truth por concern | Datos solo vía Prisma (DAOs son la única capa que toca el ORM). Zod schemas compartidos viven en `shared/`. Sin segundo ORM. | ✅ |
| IV. Contratos fuente de verdad, deploy manual | El backend no compila ni despliega contratos; solo importa sus ABIs y direcciones (desde `.env`) para escuchar eventos. | ✅ |
| V. Tipado, configurado, nombrado consistente | TypeScript strict, sin `any` injustificado. Config desde `.env` + `.env.example`. Nombres alineados al vocabulario de los contratos (eventos, estados). | ✅ |

**Resultado**: PASS. No hay violaciones que requieran Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-express-backend-server/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (contrato de la API REST)
│   └── openapi.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
server/
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
├── prisma/
│   └── schema.prisma          # datasource url (pooled) + directUrl
└── src/
    ├── index.ts               # bootstrap: Express app + arranque del listener
    ├── app.ts                 # construcción de la app Express (middlewares, rutas, /docs)
    ├── config/
    │   └── env.ts             # lectura+validación de .env con Zod (fail-fast)
    ├── controllers/           # Thin Controllers (HTTP only)
    ├── services/              # lógica de orquestación (incl. blockchain + storage)
    ├── models/                # objetos de negocio (Project, Milestone, Proposal, ...)
    ├── daos/                  # única capa que toca Prisma
    ├── middlewares/           # errorHandler, walletAuth, role checks, response format
    ├── exceptions/            # FenrirException + comunes
    ├── schemas/               # Zod internos del server (no compartidos)
    ├── routes/                # método+path → controller
    ├── blockchain/            # listener de eventos, providers ethers, ABIs, cursor de bloque
    │   ├── abis/              # ABIs exportados de /contracts
    │   ├── provider.ts
    │   ├── listener.ts        # suscripción + backfill idempotente
    │   └── handlers/          # un handler por evento → service de ingestión
    ├── storage/               # ReportStorage (interfaz) + StorageLocal (impl inicial)
    └── docs/                  # config swagger/openapi

shared/
├── schemas/                   # Zod request/response usados también por client/
├── constants/                 # enums de estado, parámetros globales fijos (shape only)
└── types/                     # DTOs/tipos compartidos

docker-compose.yml             # server + postgres (client se suma en su feature)
```

**Structure Decision**: Web service dentro del monorepo Fenrir. Se usa la estructura de capas de la skill `backend-architecture` bajo `server/src/`, más dos subárboles propios de esta feature: `blockchain/` (listener + ABIs + cursor) y `storage/` (interfaz de almacenamiento de reportes). `shared/` se usa para los contratos de shape que el frontend reutilizará; ninguna regla de negocio vive ahí.

## Complexity Tracking

> No aplica — Constitution Check pasó sin violaciones.
