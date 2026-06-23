# Research: Backend de Fenrir (Phase 0)

Resolución de incógnitas técnicas para el plan. Las decisiones de negocio ya están cerradas en `business_rules/`; acá solo se resuelven cuestiones de implementación del backend.

## 1. Ingestión de eventos on-chain idempotente y resistente a reconexión/reorg

- **Decisión**: Modelo "cursor + dedup". Se persiste un `IngestionCursor` (último bloque procesado por contrato/red). El listener combina (a) suscripción en vivo a eventos vía `provider.on(filter, ...)` y (b) un backfill por `queryFilter(filter, fromBlock, toBlock)` al arrancar y tras cada reconexión, desde `cursor - N` bloques de confirmación. Cada evento se identifica de forma única por `(txHash, logIndex)`; se persiste una tabla `ProcessedEvent` con esa clave única y todo handler hace upsert/no-op si ya existe (idempotencia). El cursor solo avanza sobre bloques con suficientes confirmaciones para tolerar reorgs cortos de testnet.
- **Rationale**: ethers v6 no garantiza entrega exactly-once ni orden tras una caída de WebSocket; la combinación backfill + clave única `(txHash, logIndex)` cubre fuera de orden, duplicados y reorgs sin lógica frágil. Cumple FR-005 y SC-005.
- **Alternativas consideradas**: (a) solo suscripción en vivo — descartada: pierde eventos durante desconexiones; (b) un indexer externo tipo The Graph — descartada: sobredimensionado para una demo y contradice "el listener corre dentro del backend" (Principio I).

## 2. Acceso al estado on-chain: eventos vs. llamadas `view`

- **Decisión**: El espejo se construye primariamente desde eventos. Para datos derivados que conviene leer puntualmente (p.ej. `getPastVotes` de una wallet en el snapshot de una propuesta, `arbiter()` actual) se permiten llamadas `view` de solo lectura desde un service de blockchain — nunca desde un controller.
- **Rationale**: Los contratos emiten eventos ricos (`Invested`, `MilestoneDeclared`, `ProposalCreated`, `VoteCast`, `ProposalResolved`, `ArbiterElected`, etc.) suficientes para el estado de catálogo/gobernanza. El poder de voto por snapshot (FR-011) es más simple y exacto leyéndolo on-chain con `getPastVotes(account, snapshotBlock)` que reconstruyéndolo de eventos de transferencia.
- **Alternativas consideradas**: Reconstruir el voting power desde todos los `Transfer` del FDT — descartada por complejidad y riesgo de drift frente al checkpoint real de ERC20Votes.

## 3. Verificación del hash de reportes de hito

- **Decisión**: El hash es `keccak`-no: SHA-256 (el contrato guarda `bytes32 reportHash`; se interpreta como SHA-256 del contenido canónico del reporte, según la constitución que dice "SHA-256"). El backend calcula el hash sobre una serialización canónica y estable del reporte servido (un manifest que enumera campos de texto + cada archivo con su propio SHA-256), de modo que el mismo contenido siempre produce el mismo hash. Al observar `MilestoneDeclared(reportHash, reportUrl)`, el service compara el hash on-chain con el del contenido en esa URL y marca `hashMatch: true|false`.
- **Rationale**: La constitución fija explícitamente SHA-256 y exige que el contenido servido coincida con el hash on-chain (FR-009, SC-002). Un manifest canónico evita ambigüedad de orden/serialización de archivos múltiples.
- **Alternativas consideradas**: Hashear un único archivo zip — descartada: el orden de compresión y metadata (timestamps) rompe la reproducibilidad del hash.

## 4. Autenticación por wallet (endpoints de escritura)

- **Decisión**: Patrón nonce + firma (estilo SIWE). El cliente pide un nonce, firma un mensaje con su wallet, y el backend verifica la firma con ethers (`verifyMessage`) recuperando la dirección. Un middleware `walletAuth` adjunta `req.wallet`. Para acciones de desarrollador, un middleware de rol verifica que esa wallet esté registrada como developer (reflejado del evento `DeveloperRegistered`).
- **Rationale**: Todo el sistema opera por wallet; no hay passwords. Verificar firma es la forma estándar y sin estado de probar control de una wallet (assumption del spec).
- **Alternativas consideradas**: Sesiones con password — descartada: incompatible con el modelo wallet-first.

## 5. Storage de reportes (interfaz abstracta)

- **Decisión**: Interfaz `ReportStorage` con `put(manifest, files): { url }` y `get(id): contenido`. Implementación inicial `StorageLocal` (filesystem del server + servido por una ruta estática/controlada). Intercambiable por una impl Supabase/S3 a futuro sin tocar services.
- **Rationale**: Decisión tomada con el usuario: no adelantar la migración a Supabase (que la constitución marca como "planeada, no inmediata"), pero dejar el punto de cambio aislado.
- **Alternativas consideradas**: Supabase Storage desde ya — descartada por el usuario.

## 6. ORM, datasource y migración futura a Supabase

- **Decisión**: Prisma con datasource de dos URLs: `url` (pooled, runtime) y `directUrl` (directo, migraciones), desde el día uno, según la skill `database`. Sin features Postgres-only que Prisma no medie, para que la migración a Supabase sea contenida.
- **Rationale**: Constitución Principio III + skill `database`. Separar pooled/direct evita reescritura al migrar.
- **Alternativas consideradas**: Una sola URL — descartada: rompe migraciones bajo pgbouncer/poolers.

## 7. Documentación de la API

- **Decisión**: Generar OpenAPI desde los mismos Zod schemas con `@asteasolutions/zod-to-openapi` y servirlo con `swagger-ui-express` en `/docs`.
- **Rationale**: Evita mantener dos definiciones del contrato (skill `backend-architecture`).
- **Alternativas consideradas**: OpenAPI escrito a mano — descartada: drift garantizado contra los Zod.

## 8. ABIs de los contratos

- **Decisión**: Exportar los ABIs (compilados en Remix) a `server/src/blockchain/abis/*.json` y versionarlos. Las direcciones de los contratos desplegados se leen de `.env` (la `FenrirFactory` es el ancla; los demás se descubren por el evento `ProjectCreated` que trae `project`, `token`, `governor`).
- **Rationale**: El repo no compila contratos (Principio IV). El factory pattern crea instancias por proyecto, así que las direcciones de project/token/governor no son fijas: se aprenden del evento.
- **Alternativas consideradas**: Hardcodear direcciones por proyecto — imposible: se crean dinámicamente.

## Resumen de incógnitas resueltas

Todas las marcas NEEDS CLARIFICATION del Technical Context quedaron resueltas. No hay bloqueos para Phase 1.
