# Phase 1 — Data Model (vista del frontend)

Las formas canónicas **ya existen** en `shared/` y el frontend las importa vía `@shared/*`
(no se redefinen, FR-026). Esta tabla mapea cada vista a su tipo/Zod de `shared/` y aclara
qué muestra el frontend. El frontend no calcula campos derivados de negocio.

> Montos: `weiStringSchema` (string entero en wei). El formateo a ETH es presentación pura.
> Direcciones: `addressSchema` (0x + 40 hex, lowercase). Hashes: `bytes32Schema`.

## Enums (`@shared/constants/enums`)

`ProjectType` `Investment|Civic` · `ProjectStatus` `Funding|Building|Selling|Completed|Cancelled`
· `MilestoneStatus` `Pending|Declared|Voting|Approved|Rejected` · `OfferStatus`
`Voting|Approved|Rejected|Refunded|Executed` · `VotingMode` `ByToken|OneWalletOneVote` ·
`ProposalKind` `ArbiterElection|Milestone|SaleOffer` · `ProposalStatus`
`Active|AwaitingArbiter|Resolved` · `ProposalResult` `None|Approved|Rejected` ·
`CertificateType` `Completion|Failure` · `ClaimType` `Refund|Distribution`

## Entidades de vista → schema de `shared/`

| Vista | Schema (`@shared/schemas/…`) | Qué muestra el frontend |
|---|---|---|
| Catálogo (item) | `project.schema → projectResponseSchema` | tipo, estado, `fmpa`/`ff`/`totalRaised`, deadline |
| Detalle de proyecto | `project.schema → projectDetailResponseSchema` | todo lo anterior + `milestones[]`, direcciones, árbitro, `currentMilestoneIndex`, precios |
| Hito | `project.schema → milestoneResponseSchema` | `status`, `budget`, `deadline`, `retryCount`, `trancheReleased`, `reportHash`/`reportUrl`, `proposalId` |
| Inversión | `project.schema → investmentResponseSchema` | `amount`, `txHash`, `block` por proyecto |
| Propuesta | `proposal.schema → proposalResponseSchema` | `kind`, `deadline`, `votesFor/Against`, `quorumBps`, `approvalThresholdBps`, `quorumReached`, `status`, `result`, `electedArbiter` |
| Poder de voto | `proposal.schema → votingPowerResponseSchema` | `votingPower`, `hasVoted`, `snapshotBlock` |
| Árbitro | `proposal.schema → arbiterResponseSchema` | `currentArbiter`, `electionInProgress` |
| Oferta de venta | `sale.schema → saleOfferResponseSchema` | `offerId`, `buyerWallet`, `amount`, `status`, `proposalId` |
| Reparto | `sale.schema → distributionResponseSchema` | `salePrice`, `distributionPool`, `shares[]` con `claimable` |
| Reclamables | `sale.schema → claimableResponseSchema` | `items[]` (`Refund`/`Distribution`, `amount`) |
| Developer | `developer.schema → developerResponseSchema` | `razonSocial`, `cuit`, `verificationDocsUrl` |
| Reputación | `developer.schema → reputationResponseSchema` | `completed`, `failed`, `certificates[]` |
| Reporte | `report.schema → reportResponseSchema` | `text`, `mediaUrls`, `documentUrls`, `reportHash` |
| Verificación de reporte | `report.schema → reportVerificationSchema` | `computedHash`, `onChainHash`, `hashMatch` |
| Crear reporte (req/res) | `report.schema → createReportBodySchema` / `createReportResponseSchema` | input multipart; output `reportUrl`+`reportHash` para la tx |
| Auth | `auth.schema → nonceResponseSchema` / `verifyResponseSchema` | `message` a firmar; `valid` |
| Genéricos | `types/api → Paginated<T>`, `ApiError` | paginación y forma de error |

## Estado de cliente (no proviene de la API)

| Entidad | Campos | Notas |
|---|---|---|
| WalletSession | `connectedAddress`, `chainId`, `isOnSepolia`, `authenticated` | `isOnSepolia` = comparación de formato con `VITE_SEPOLIA_CHAIN_ID` (11155111), no es regla de negocio |
| TxState | `phase` (`signing\|mining\|propagating\|confirmed\|failed`), `hash?`, `error?` | derivado del flujo de `lib/chain` + re-consulta al backend (D4) |

## Intenciones de escritura on-chain (capa `lib/chain`)

No son entidades de datos sino acciones; cada una es una función de dominio que arma un
`ethers.Contract` y firma. Detalle en `contracts/chain.md`.

| Intención | Contrato | Dirección |
|---|---|---|
| Crear proyecto | FenrirFactory | env `VITE_FENRIR_FACTORY_ADDRESS` |
| Invertir | FenrirProject | `project.address` |
| Declarar hito | FenrirProject | `project.address` |
| Votar (hito/árbitro/oferta) | FenrirGovernor | `project.governorAddress` |
| Ofertar / depositar | FenrirProject | `project.address` |
| Reclamar (refund/distribution) | FenrirProject | `project.address` |
