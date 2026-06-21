<!--
Sync Impact Report
- Version change: 1.3.0 → 1.4.0
- Modified principles:
  - V (env-vars bullet): every module that needs environment variables MUST read,
    validate and export them in a single dedicated config module per module/service
    (e.g. `server/src/config/env.ts`), and the rest of that module's code MUST import
    from it — never touch `process.env` / `import.meta.env` directly outside that one
    file. Validation is fail-fast (Zod parse at load).
- Modified sections:
  - "Governance" → "Compliance review": added the read-only auditor agent
    `auditor-env-config` (skill `env-config-centralization`) that verifies the
    single-config-module rule and reports violations.
- Added sections: none (existing sections expanded)
- Removed sections: none
- Prior history (1.2.0 → 1.3.0): added a "Logging" bullet to Principle V — all
  logging goes through a single configured logger (pino), never `console.*`, in both
  `server/` and `client/`, with log behaviour (at minimum the level) read from `.env`.
- Prior history (1.1.0 → 1.2.0): added Principle III "Per-folder dependency
  isolation" (no root manifest; each top-level folder self-contained) and annotated
  the repo-structure tree accordingly.
- Prior history (1.0.0 → 1.1.0): clarified II/III about `shared/` carrying only
  shape contracts, never business logic, and resolved `client/`/`server/` naming.
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ compatible as-is
  - .specify/templates/spec-template.md ✅ compatible as-is
  - .specify/templates/tasks-template.md ✅ compatible as-is
- Follow-up TODOs: none
-->

# Fenrir Constitution

## Core Principles

### I. On-Chain / Off-Chain Separation (Hybrid Architecture)

Fenrir is hybrid by design. What lives on-chain (Sepolia smart contracts) vs. off-chain
(backend + PostgreSQL) is fixed, not a per-feature choice:

- **On-chain**: custody of funds, FDT issuance, milestone state, DAO voting, final
  distribution. This is the system of record for anything that needs public,
  verifiable trust.
- **Off-chain**: anything heavy or expensive to put on a blockchain — progress photos
  and videos, extended report text, documents (purchase agreements, plans), and
  developer identity verification.
- For every declared milestone, only a light record goes on-chain: milestone ID,
  declaring wallet, block timestamp, a URL to the full report in the application, and
  a SHA-256 hash of that report's content. The backend MUST serve the full report at
  that URL, and its content MUST always match the on-chain hash.
- The backend MUST listen to contract events (via ethers.js or equivalent) to keep a
  fast, queryable copy of on-chain state in PostgreSQL. The frontend MUST NOT read
  on-chain state directly on every render.

**Rationale**: keeps the expensive, trust-critical parts on a public verifiable ledger
while keeping the system usable and affordable to run.

### II. No Business Logic in the Frontend

All business logic — calculations (amounts, terms, payouts), rule validation (who can
vote, whether a milestone can be declared), and flow decisions based on those rules —
lives in `/contracts` or `server/src`, never in `client/src` or `shared/`. The frontend
is deliberately "dumb": it renders whatever the API returns, forwards user input as-is,
and decides or validates nothing with business weight. UI-only validation (required
fields, format) is the sole permitted exception — including reusing a shared Zod
schema from `shared/` to validate that shape, which is a contract check, not a business
decision. `shared/` itself follows the same rule: it may only hold shape/format
contracts and constants, never a business-rule decision (see Principle III).

**Rationale**: prevents the same rule from being implemented three times (contract,
backend, frontend) and drifting out of sync between them.

### III. Single Source of Truth per Concern

- **Data access**: the backend reaches PostgreSQL only through **Prisma**. No raw SQL
  and no second ORM running in parallel. This keeps the eventual migration to
  **Supabase** a contained change instead of a rewrite — avoid binding queries to
  Postgres-only features that Prisma doesn't mediate.
- **UI**: components come from **shadcn/ui** only; no native primitive is built from
  scratch unless shadcn/ui has no equivalent.
- **HTTP client**: the frontend uses a single centralized Axios instance; no
  component instantiates its own Axios client.
- **Shared contracts**: Zod schemas, constants, and TypeScript types used by both
  `client/` and `server/` are defined once in `shared/` and imported by both sides —
  neither side redefines or duplicates them locally. `shared/` carries shape/format
  contracts and constants only, never business-rule logic (see Principle II).
- **Per-folder dependency isolation**: the repo root carries NO dependencies — there
  is no root `package.json`, no root lockfile, and no root `node_modules`, and the
  repo MUST NOT be wired as an npm/yarn/pnpm workspace that hoists deps to the root.
  Each top-level folder (`shared/`, `server/`, `client/`, `contracts/`) is
  self-contained: its own `package.json`, its own lockfile, its own installed
  `node_modules`. **Dependencies may be duplicated across folders; code may not** —
  e.g. `zod` is a real installed dependency of `shared/`, `server/`, and `client/`,
  but the Zod schemas/constants/types themselves are written once in `shared/` and
  imported by `client/` and `server/` (never re-declared). The sharing is by import,
  not by copy.

**Rationale**: one place to change behavior, one place to look when debugging — while
keeping every folder independently installable, buildable, and deployable (each
service builds from its own folder, as the per-service Dockerfiles already assume)
without a fragile root that couples them all together.

### IV. Contracts Are Source of Truth, Deployed Manually

The `.sol` files under `/contracts` are the source of truth for on-chain behavior, but
this repo does not compile or deploy them — there is no Hardhat/Foundry pipeline.
They are copied manually into Remix IDE to compile and deploy to Sepolia. If a local
compilation pipeline is ever introduced, it MUST be documented in CLAUDE.md before
being relied upon.

**Rationale**: Fenrir is a university blockchain seminar project demonstrated on
Sepolia, not a production deployment pipeline — the manual Remix step is intentional,
not a gap to silently "fix" by adding tooling.

### V. Typed, Configured, Consistently Named

- TypeScript across frontend and backend; no `any` without explicit justification.
- Environment variables are always read from `.env`, never hardcoded; each service
  keeps an up-to-date `.env.example`.
- **Single env-config module per module.** Every module/service that consumes
  environment variables MUST read, validate and export them from **one dedicated
  config module** — e.g. `server/src/config/env.ts` for the backend, an equivalent
  single file for `client/` or any other top-level folder that needs config. That
  module is the only place allowed to touch the raw environment (`process.env` on the
  backend, `import.meta.env` on the frontend); the rest of the code imports the typed,
  validated values from it and MUST NOT read the raw environment directly. Validation
  is **fail-fast**: the config module parses/validates at load (Zod) and throws if a
  required variable is missing or malformed, so a misconfigured service never boots in
  a half-valid state. A module that uses no env vars needs no such file.
- **Logging** goes through a single configured logger — **pino** — never `console.*`.
  Both `server/` and `client/` log through pino (its Node build on the backend, its
  browser build on the frontend), wrapped in one logger module per service so the
  rest of the code imports that module instead of touching pino or `console`
  directly. Log behaviour is configurable from `.env` like every other config — at
  minimum the level (e.g. backend `LOG_LEVEL`, plus an optional `LOG_PRETTY` for
  human-readable dev output) — never hardcoded. `console.log`/`console.error` MUST
  NOT appear in committed application code.
- Contracts, events, and functions follow the project's existing naming vocabulary —
  `PascalCase` for contracts/events, `camelCase` for functions (e.g. `FenrirFactory`,
  `declareComplete`) — so code matches the vocabulary used in design discussions.

**Rationale**: consistency here is what lets a contract event, a backend listener, and
a frontend label all refer to "the same thing" without a lookup table.

## Technology Stack & Architecture Constraints

| Layer | Technology | Deploy |
|---|---|---|
| Frontend | React + TypeScript (`.tsx`), Tailwind CSS, shadcn/ui, Axios | Vercel |
| Backend | Express + TypeScript | Render |
| Database | PostgreSQL via Prisma ORM (migration to Supabase planned, not immediate) | — |
| Containers | Per-service Dockerfile (`client`, `server`) + root `docker-compose.yml` | — |
| Smart contracts | Solidity (`.sol`), separate folder, manual deploy via Remix IDE | Sepolia (testnet) |

Repository structure:

The repo root holds no manifest and no dependencies (see Principle III) — every folder
below carries and installs its own `package.json` + `node_modules`:

```
fenrir/                     # NO root package.json / lockfile / node_modules — not a workspace
├── client/                 # React + TSX + Tailwind + shadcn/ui — own package.json + deps
├── server/                 # Express + TypeScript — own package.json + deps
├── shared/                 # Zod schemas, constants, types imported by client/ and server/ — own package.json + deps
├── contracts/              # .sol — source of truth, exported to Remix — own package.json (OpenZeppelin, reference only)
├── business_rules/         # business rules (roles, project types, tokens, milestones...)
├── docker-compose.yml
├── CLAUDE.md
└── README.md
```

Smart contracts (`/contracts`):

| Contract | Responsibility |
|---|---|
| `FenrirFactory.sol` | Entry point. Creates new projects and deploys the linked instances of the other three contracts |
| `FenrirProject.sol` | Custodies tranche funds per milestone, releases budget to the developer, tracks milestone state, manages sale deposits and final claims |
| `FenrirToken.sol` | The FDT. Mints on investment, supports snapshot for voting, burns on claim (Inversión) |
| `FenrirGovernor.sol` | Governance engine (OpenZeppelin Governor pattern). Creates proposals, counts votes, validates quorum/threshold, resolves ties and quorum failures, executes the approved action |

Business rules (roles, project types, tokens, milestone lifecycle, funding, commission,
edge cases, glossary) live in `business_rules/index.md`, not in this constitution or in
CLAUDE.md — that is where business decisions get discussed and written down.

## Development Workflow & Deployment

- Local: `docker compose up --build` brings up `client`, `server`, and `postgres` on
  one local network. Minimum env vars — Backend: `DATABASE_URL` (pooled), `DIRECT_URL`
  (direct, for Prisma migrations), `PORT`, `SEPOLIA_RPC_URL`, deployed contract
  addresses, `LOG_LEVEL` (optionally `LOG_PRETTY`). Frontend: `VITE_API_URL`,
  `VITE_SEPOLIA_CHAIN_ID`.
- Deploy: frontend → Vercel (connected to `client/`); backend → Render (connected to
  `server/`, running that service's Dockerfile).
- The production database runs separately from the app containers (Render Postgres
  today, Supabase planned). The backend MUST NOT assume the database lives on the same
  host as its container.

## Governance

- This constitution governs non-negotiable technical/architectural principles binding
  on every `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`
  cycle. Business decisions (roles, tokens, milestones, funding, commission, edge
  cases) are governed separately in `business_rules/` and are out of scope here.
- **Amendments**: proposed and applied via `/speckit-constitution`, which must also
  re-check `.specify/templates/plan-template.md`, `spec-template.md`, and
  `tasks-template.md` for consistency and record the result in this file's Sync Impact
  Report.
- **Versioning**: semantic versioning for this document — MAJOR for backward
  incompatible principle removals/redefinitions, MINOR for new principles or
  materially expanded guidance, PATCH for wording/clarification fixes.
- **Compliance review**: the agents defined in `.claude/agents/` (`developer`,
  `frontend`, `database`) MUST apply the principles above before writing or reviewing
  code in their domain. `analista-funcional` audits compliance with `business_rules/`
  separately and is not a check against this constitution. The read-only auditor
  `auditor-env-config` (skill `env-config-centralization`) verifies the
  single-env-config-module rule of Principle V and reports any code that reads the raw
  environment outside its module's dedicated config file. Use `CLAUDE.md` for the
  short project overview and pointers; it does not duplicate what is fixed here.

**Version**: 1.4.0 | **Ratified**: 2026-06-21 | **Last Amended**: 2026-06-21
