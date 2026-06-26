# Contrato — API del backend que el frontend consume

Subconjunto de `specs/001-express-backend-server/contracts/openapi.md` desde la óptica del
frontend. Es **el contrato del backend ya existente**, no algo nuevo de esta feature; acá se
documenta qué consume cada slice y desde qué `service`. Toda llamada pasa por la única
instancia de Axios (`lib/api.ts`) y vive en `src/services/`.

Convenciones:
- Base: `VITE_API_URL`. Errores: `{ error, error_code, details? }` (`@shared/types/api → ApiError`).
- 🔒 = requiere auth por firma de wallet (`Authorization: Wallet <…>`).
- Las respuestas validan contra los Zod de `@shared/schemas/*` (ver `data-model.md`).

## Auth → `auth.service.ts`

| Método | Path | Body | Respuesta |
|---|---|---|---|
| POST | `/auth/nonce` | `{ wallet }` | `{ nonce, message }` |
| POST | `/auth/verify` | `{ wallet, signature }` | `{ wallet, valid }` |

## Proyectos (lectura) → `projects.service.ts` — US1, US5

| Método | Path | Query | Respuesta |
|---|---|---|---|
| GET | `/projects` | `type?`, `status?`, `page?`, `pageSize?` | `Paginated<ProjectResponse>` |
| GET | `/projects/buyer-view` | `page?`, `pageSize?` | `Paginated<ProjectResponse>` (solo `Selling`) |
| GET | `/projects/{address}` | — | `ProjectDetailResponse` |
| GET | `/projects/{address}/milestones` | — | `MilestoneResponse[]` → `milestones.service.ts` |

## Reportes de hito → `reports.service.ts` — US3

| Método | Path | Body | Respuesta |
|---|---|---|---|
| POST 🔒 | `/projects/{address}/milestones/{index}/report` | multipart: `text` + media/docs | `{ reportId, reportUrl, reportHash }` |
| GET | `/reports/{reportId}` | — | `ReportResponse` |
| GET | `/reports/{reportId}/verification` | — | `{ computedHash, onChainHash, hashMatch }` |

## Gobernanza → `proposals.service.ts` — US3

| Método | Path | Query | Respuesta | Polling |
|---|---|---|---|---|
| GET | `/projects/{address}/proposals` | — | `ProposalResponse[]` | sí, si hay `Active` |
| GET | `/projects/{address}/proposals/{proposalId}` | — | `ProposalResponse` | sí, si `Active` |
| GET | `/projects/{address}/proposals/{proposalId}/voting-power` | `wallet` | `VotingPowerResponse` | — |
| GET | `/projects/{address}/arbiter` | — | `ArbiterResponse` | — |

## Desarrolladores → `developers.service.ts` — US4

| Método | Path | Body | Respuesta |
|---|---|---|---|
| GET | `/developers/{wallet}` | — | `DeveloperResponse \| 404` |
| GET | `/developers/{wallet}/reputation` | — | `ReputationResponse` |
| POST 🔒 | `/developers/{wallet}/verification` | multipart/material | `200` |

## Venta y reparto → `offers.service.ts` / `distribution.service.ts` — US5

| Método | Path | Respuesta | Polling |
|---|---|---|---|
| GET | `/projects/{address}/offers` | `SaleOfferResponse[]` | sí, si hay `Voting` |
| GET | `/projects/{address}/distribution` | `DistributionResponse` | — |

## Inversores → `investors.service.ts` — US2

| Método | Path | Respuesta |
|---|---|---|
| GET | `/investors/{wallet}/investments` | `InvestmentResponse[]` |
| GET | `/investors/{wallet}/claimable` | `ClaimableResponse` |

## Infra

| Método | Path | Uso |
|---|---|---|
| GET | `/health` | estado del backend/listener (último bloque) — banner de salud opcional |

## Nota

Ningún endpoint ejecuta transacciones on-chain. Las acciones (invest/vote/declare/
submitOffer/claim/createProject) se firman desde el frontend directo contra los contratos
(ver `contracts/chain.md`). El backend solo sirve lecturas y recibe la subida de reportes y
material de verificación.
