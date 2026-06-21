# CLAUDE.md

Fenrir reemplaza al fiduciario humano de un fideicomiso tradicional por smart contracts
y un DAO: los inversores votan, de forma pública y verificable, si cada etapa de un
proyecto se cumplió. Una sola fábrica de contratos (`FenrirFactory`) crea dos tipos de
proyecto sobre la misma infraestructura — **Fenrir Inversión** (con fines de lucro,
reparto de ganancia al vender) y **Fenrir Cívico** (sin fines de lucro, obra pública).
Se desarrolla y se demuestra sobre **Sepolia**; es un proyecto de seminario
universitario de introducción a blockchain, no maneja dinero real.

No repetir acá lo que ya vive en otro lado — leer siempre la fuente correspondiente:

- **Core técnico del proyecto** (principios no negociables, stack, estructura de
  repo, arquitectura on-chain/off-chain, convenciones de código, workflow de
  despliegue): [`.specify/memory/constitution.md`](.specify/memory/constitution.md).
- **Reglas de negocio** (roles, tipos de proyecto, tokens, ciclo de hitos, fondeo,
  comisión, casos borde, glosario): [`business_rules/index.md`](business_rules/index.md).

<!-- SPECKIT START -->
Plan activo: [`specs/001-express-backend-server/plan.md`](specs/001-express-backend-server/plan.md)
— backend de Fenrir en Express + TypeScript (API REST + listener de eventos on-chain
espejado en PostgreSQL vía Prisma). Ver también `spec.md`, `research.md`, `data-model.md`,
`contracts/openapi.md` y `quickstart.md` en esa carpeta.
<!-- SPECKIT END -->
