# API Contract: Backend de Fenrir (Phase 1)

Contrato REST que el backend expone al frontend. Endpoints de **lectura** son públicos (el frontend nunca lee on-chain directo). Endpoints de **escritura** requieren auth por firma de wallet (`Authorization: Wallet <signature>` resuelto por el middleware `walletAuth`). El spec OpenAPI real se genera desde los Zod schemas (`@asteasolutions/zod-to-openapi`) y se sirve en `GET /docs`.

Convención de errores (middleware `errorHandler`): `{ error, error_code, details? }` con el `status_code` de la `FenrirException`.

## Auth

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `POST` | `/auth/nonce` | — | Body `{ wallet }`. Devuelve `{ nonce, message }` para firmar. |
| `POST` | `/auth/verify` | — | Body `{ wallet, signature }`. Verifica la firma; devuelve `{ token }` (o sesión) para usar en endpoints de escritura. |

## Proyectos (lectura) — US1, US5

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `GET` | `/projects` | — | Catálogo paginado. Query: `type?`, `status?`, `page?`, `pageSize?`. (FR-002) |
| `GET` | `/projects/buyer-view` | — | Catálogo limitado a `status=Selling` para rol comprador (FR-004, SC-003). |
| `GET` | `/projects/{address}` | — | Detalle: fondeo (fmpa/ff/totalRaised), hitos, etapa de venta si aplica (FR-003). |
| `GET` | `/projects/{address}/milestones` | — | Lista de hitos con estado, presupuesto, deadline, retryCount. |

## Reportes de hito — US2

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `POST` | `/projects/{address}/milestones/{index}/report` | wallet (developer dueño) | Multipart: texto + media + docs. Devuelve `{ reportUrl, reportHash }` para la tx on-chain (FR-006, FR-007). |
| `GET` | `/reports/{reportId}` | — | Sirve el reporte completo (texto + URLs de media/docs) (FR-008). |
| `GET` | `/reports/{reportId}/verification` | — | `{ computedHash, onChainHash, hashMatch }` (FR-009, SC-002). |

## Gobernanza — US3

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `GET` | `/projects/{address}/proposals` | — | Propuestas con kind, snapshot, deadline, quórum/umbral, resultado (FR-010). |
| `GET` | `/projects/{address}/proposals/{proposalId}` | — | Detalle de una propuesta + votos agregados. |
| `GET` | `/projects/{address}/proposals/{proposalId}/voting-power?wallet=` | — | Poder de voto de la wallet en el snapshot + si ya votó (FR-011). |
| `GET` | `/projects/{address}/arbiter` | — | Árbitro actual / vacancia / re-elección en curso (FR-012). |

## Desarrolladores — US4

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `GET` | `/developers/{wallet}` | — | Identidad (razón social, CUIT) + material de verificación (FR-013). |
| `GET` | `/developers/{wallet}/reputation` | — | Certificados de finalización y de proyecto fallido, enlazados a su proyecto (FR-014). |
| `POST` | `/developers/{wallet}/verification` | wallet (mismo developer) | Sube material de verificación de identidad off-chain. |

## Venta y reparto — US5

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `GET` | `/projects/{address}/offers` | — | Ofertas con monto, estado, comprador (FR-016). |
| `GET` | `/projects/{address}/distribution` | — | Precio final, pool de reparto, parte reclamable por inversor (FR-017). |

## Inversores — historial y reclamos

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `GET` | `/investors/{wallet}/investments` | — | Historial de inversión por proyecto (FR-018). |
| `GET` | `/investors/{wallet}/claimable` | — | Lo que la wallet puede reclamar hoy (refund/distribution) (FR-018, FR-019). |

## Salud / infra

| Método | Path | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | — | Liveness + estado del listener (último bloque procesado). |
| `GET` | `/docs` | — | Swagger UI generado desde los Zod schemas. |

## Notas de contrato

- Ningún endpoint ejecuta transacciones on-chain: las acciones (invest, vote, declare, submitOffer, claim) las firma la wallet del usuario desde el frontend directo contra el contrato. El backend solo prepara datos (reportes) y refleja estado.
- Los Zod schemas de request/response que el `client/` reutilice viven en `shared/schemas/`; los internos del server en `server/src/schemas/`.
