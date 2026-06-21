# Data Model: Backend de Fenrir (Phase 1)

Modelo del **espejo off-chain** en PostgreSQL (vía Prisma). Importante: estas tablas reflejan estado ya calculado on-chain; el backend no decide reglas de negocio sobre ellas (FR-020). Los montos on-chain son `uint256` en wei → se persisten como `String`/`Decimal` para no perder precisión (nunca `number`/`float`).

## Convenciones

- Direcciones de wallet/contrato: `String` (hex `0x...`, normalizado a lowercase).
- Montos en wei: `Decimal` (Postgres `numeric`) o `String`; nunca `Float`.
- Enums espejan exactamente los de los contratos (mismos nombres).
- Toda entidad sincronizada lleva `lastEventBlock`/`updatedAt` para trazar la última actualización.

## Enums (espejan los contratos)

- `ProjectType`: `Investment | Civic`
- `ProjectStatus`: `Funding | Building | Selling | Completed | Cancelled`
- `MilestoneStatus`: `Pending | Declared | Voting | Approved | Rejected`
- `OfferStatus`: `Voting | Approved | Rejected | Refunded | Executed`
- `VotingMode`: `ByToken | OneWalletOneVote`
- `ProposalKind`: `ArbiterElection | Milestone | SaleOffer`
- `ProposalResult`: `None | Approved | Rejected`
- `CertificateType`: `Completion | Failure`
- `ClaimType`: `Refund | Distribution`

## Entidades

### Developer
Identidad y reputación del desarrollador (espejo de `FenrirFactory.developers` + certificados + material off-chain).
- `wallet` (PK, address)
- `razonSocial` (String)
- `cuit` (String, único — refleja la regla "1 wallet por CUIT", FR-015)
- `verificationDocsUrl` (String?, material de verificación off-chain — almacenado vía ReportStorage)
- `registeredAtBlock` (BigInt)
- Relaciones: `projects` (1..N), `certificates` (0..N)

### Project
Una instancia de proyecto Fenrir (espejo de un `FenrirProject` + su token/governor).
- `address` (PK, address del FenrirProject)
- `tokenAddress` (address, FenrirToken)
- `governorAddress` (address, FenrirGovernor)
- `developerWallet` (FK → Developer)
- `projectType` (ProjectType)
- `votingMode` (VotingMode)
- `status` (ProjectStatus)
- `fmpa`, `ff`, `totalRaised`, `totalReleasedToDeveloper` (Decimal wei)
- `estimatedSalePrice`, `salePrice` (Decimal wei, salePrice nullable hasta ejecutar venta)
- `fundingDeadline` (DateTime, del TTL de fondeo on-chain)
- `penaltyAccumulatedBps` (Int)
- `currentArbiter` (address?, vacío si vacante)
- `currentMilestoneIndex` (Int)
- `createdAtBlock` (BigInt)
- Relaciones: `milestones`, `proposals`, `investments`, `saleOffers`, `claims`
- **Validación de exposición**: el catálogo para rol comprador filtra `status = Selling` (FR-004) — regla de *consulta*, no de negocio.

### Milestone
Etapa de obra / hito (incluye hito 0 conceptual y, en Inversión, el cierre de venta como etapa).
- `id` (PK interno)
- `projectAddress` (FK → Project)
- `milestoneIndex` (Int, índice on-chain)
- `budget` (Decimal wei)
- `deadline` (DateTime)
- `status` (MilestoneStatus)
- `retryCount` (Int)
- `trancheReleased` (Bool)
- `reportHash` (String?, bytes32 hex on-chain)
- `reportUrl` (String?)
- `proposalId` (Int?, propuesta de votación on-chain asociada)
- Unicidad: `(projectAddress, milestoneIndex)`
- Relaciones: `report` (0..1 MilestoneReport)

### MilestoneReport
Contenido off-chain completo del reporte de un hito (servido por URL, hash verificable).
- `id` (PK)
- `milestoneId` (FK → Milestone, nullable hasta que se observe el `MilestoneDeclared` que lo enlaza — ver edge case "reporte subido pero nunca declarado")
- `projectAddress`, `milestoneIndex` (para enlazar antes de tener milestoneId)
- `text` (String, reporte extendido)
- `mediaUrls` (String[], fotos/videos)
- `documentUrls` (String[], documentos)
- `computedHash` (String, SHA-256 del manifest canónico calculado por el backend)
- `onChainHash` (String?, `reportHash` observado on-chain)
- `hashMatch` (Bool?, null hasta observar el evento; FR-009)
- `storageRef` (String, referencia interna del ReportStorage)
- `createdByWallet` (address, el developer)

### Investment
Aporte de un inversor (espejo de eventos `Invested`).
- `id` (PK)
- `projectAddress` (FK → Project)
- `investorWallet` (address)
- `amount` (Decimal wei)
- `txHash`, `logIndex`, `block` (trazabilidad on-chain)
- Unicidad: `(txHash, logIndex)`

### Proposal
Votación del DAO (espejo de `FenrirGovernor` proposals).
- `id` (PK interno)
- `projectAddress` (FK → Project)
- `governorProposalId` (Int, id on-chain)
- `kind` (ProposalKind)
- `refId` (Int, milestoneId u offerId según kind)
- `snapshotBlock` (BigInt)
- `totalPowerAtSnapshot` (Decimal)
- `deadline` (DateTime)
- `extended` (Bool)
- `votesFor`, `votesAgainst`, `weightVoted` (Decimal)
- `status` (Active | AwaitingArbiter | Resolved)
- `result` (ProposalResult)
- `electedArbiter` (address?, solo ArbiterElection)
- Unicidad: `(projectAddress, governorProposalId)`
- Relaciones: `votes`

### Vote
Voto emitido por una wallet (espejo de `VoteCast`).
- `id` (PK)
- `proposalId` (FK → Proposal)
- `voterWallet` (address)
- `weight` (Decimal)
- `support` (Bool?, null en elección de árbitro donde se vota candidato)
- `candidate` (address?, solo ArbiterElection)
- `txHash`, `logIndex`, `block`
- Unicidad: `(proposalId, voterWallet)`

### SaleOffer
Oferta de compra en etapa de venta (solo Investment).
- `id` (PK)
- `projectAddress` (FK → Project)
- `offerId` (Int, id on-chain)
- `buyerWallet` (address)
- `amount` (Decimal wei)
- `proposalId` (Int, propuesta de venta on-chain)
- `status` (OfferStatus)
- Unicidad: `(projectAddress, offerId)`

### ReputationCertificate
Certificado de Finalización o de Proyecto Fallido (soulbound ERC-721, espejo).
- `id` (PK)
- `developerWallet` (FK → Developer)
- `type` (CertificateType)
- `tokenId` (Int, on-chain)
- `projectAddress` (address de origen)
- `mintedAtBlock` (BigInt)

### Claim
Reclamo de reembolso o reparto por un inversor (espejo de `RefundClaimed`/`DistributionClaimed`).
- `id` (PK)
- `projectAddress` (FK → Project)
- `investorWallet` (address)
- `type` (ClaimType)
- `amount` (Decimal wei)
- `txHash`, `logIndex`, `block`
- Unicidad: `(txHash, logIndex)`

### IngestionCursor
Cursor del listener para reanudar sin perder/duplicar (FR-005).
- `id` (PK, p.ej. nombre de red/contrato `"sepolia:factory"`)
- `lastProcessedBlock` (BigInt)
- `updatedAt` (DateTime)

### ProcessedEvent
Dedup de eventos ya aplicados (idempotencia, resistencia a reorg).
- `txHash` + `logIndex` (PK compuesta)
- `eventName` (String)
- `processedAt` (DateTime)

### AuthNonce
Nonces para auth por firma de wallet.
- `wallet` (PK, address)
- `nonce` (String)
- `expiresAt` (DateTime)

## Relaciones (resumen)

- Developer 1—N Project, Developer 1—N ReputationCertificate
- Project 1—N Milestone, 1—N Proposal, 1—N Investment, 1—N SaleOffer, 1—N Claim
- Milestone 1—0..1 MilestoneReport
- Proposal 1—N Vote

## Reglas de estado (solo reflejo, no decisión)

Las transiciones (`Pending → Declared → Voting → Approved/Rejected`, `Funding → Building → Selling → Completed/Cancelled`, etc.) las decide y ejecuta el contrato; el backend solo persiste la transición que el evento on-chain le comunica. El backend NUNCA fuerza una transición por su cuenta.
