# Feature Specification: Frontend de Fenrir (client/)

**Feature Branch**: `002-frontend-client`

**Created**: 2026-06-22

**Status**: Draft

**Input**: Frontend `client/` de Fenrir: capa de presentación que renderiza el estado que
expone la API REST del backend (espejo del estado on-chain) y permite a cada rol firmar
sus acciones on-chain con su wallet. Construido sobre el backend ya existente
(`server/`, contrato en `specs/001-express-backend-server/contracts/openapi.md`) y los
contratos de forma compartidos en `shared/`.

## Overview

Fenrir reemplaza al fiduciario humano de un fideicomiso por smart contracts y un DAO. Esta
feature define la **capa de presentación web** (`client/`): la ventana con la que los cinco
roles del sistema observan un proyecto y disparan acciones.

Arquitectura confirmada por el backend ya implementado (no es una decisión abierta de esta
feature):

- **Lecturas**: el frontend consume la **API REST pública** del backend (`server/`), que
  mantiene un espejo rápido y consultable del estado on-chain en PostgreSQL. El frontend
  **nunca** lee la cadena directamente para mostrar datos.
- **Escrituras on-chain** (invertir, votar, declarar hito, ofertar, reclamar): las **firma
  la wallet del usuario directamente contra los smart contracts**. El backend no ejecuta ni
  prepara estas transacciones (ver nota de contrato en `openapi.md`): el frontend usa las
  direcciones de contrato que la API ya expone por proyecto (`address`, `tokenAddress`,
  `governorAddress`) más la dirección del `FenrirFactory` (variable de entorno) y las ABIs
  de los contratos.
- **Escrituras off-chain** (subir el reporte de un hito, subir material de verificación de
  identidad): van al backend y requieren autenticación por **firma de wallet**
  (`POST /auth/nonce` → firmar → `POST /auth/verify`; header `Authorization: Wallet <…>`).

El frontend no contiene lógica de negocio (Principio II): no calcula montos, comisiones,
quórum ni elegibilidad; la API ya entrega todo resuelto y el contrato es quien valida cada
transacción. La interfaz solo valida formato/campos requeridos reutilizando los Zod schemas
de `shared/`.

La identidad del usuario es su **wallet conectada**; el rol mostrado se deriva de su
relación con cada proyecto (developer dueño, tenedor de FDT, árbitro electo, o comprador
externo), no de un login con contraseña.

**Vocabulario de estados** (canónico, importado de `shared/constants/enums.ts`, en inglés):
`ProjectType` = `Investment` | `Civic`; `ProjectStatus` = `Funding` | `Building` |
`Selling` | `Completed` | `Cancelled`; `MilestoneStatus` = `Pending` | `Declared` |
`Voting` | `Approved` | `Rejected`; `OfferStatus` = `Voting` | `Approved` | `Rejected` |
`Refunded` | `Executed`; `ProposalKind` = `ArbiterElection` | `Milestone` | `SaleOffer`;
`ProposalStatus` = `Active` | `AwaitingArbiter` | `Resolved`; `ProposalResult` = `None` |
`Approved` | `Rejected`. Los textos visibles pueden estar en español, pero el frontend usa
estos valores, no copias propias.

## Clarifications

### Session 2026-06-22

- Q: Tras restaurar el merge del backend, ¿sobre qué se basa el frontend? → A: Sobre el
  backend real ya implementado: API REST de `openapi.md` para lecturas y subida de
  reportes, y firma directa contra los contratos para las acciones on-chain. Reemplaza
  cualquier supuesto previo de "el backend prepara la transacción".
- Q: ¿Qué stack web3 usa el frontend para conectar la wallet y firmar? → A: ethers v6
  crudo (sin wagmi ni RainbowKit). El provider/signer se obtiene de `window.ethereum`
  (`BrowserProvider`); las ABIs de los contratos se usan con `ethers.Contract` para firmar
  invest/vote/declare/offer/claim. La conexión de wallet y la UI se arman a mano con
  shadcn/ui.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explorar proyectos como lector (Priority: P1)

Cualquiera, con o sin wallet, abre la app, ve el catálogo de proyectos (paginado, filtrable
por tipo y estado) y abre el detalle de uno para entender su etapa, fondeo, hitos y
reportes. Recorrido de solo lectura que demuestra el sistema de punta a punta contra la API
real.

**Why this priority**: es el MVP más chico y demostrable; toda otra pantalla parte de acá.
Valida de inmediato la integración con la API del backend ya existente.

**Independent Test**: con el backend (o su mock) sirviendo proyectos, recorrer el catálogo,
filtrar por `type`/`status`, paginar, y abrir el detalle de un proyecto viendo todos sus
datos — sin firmar nada.

**Acceptance Scenarios**:

1. **Given** un visitante sin wallet, **When** abre la app, **Then** ve el catálogo
   (`GET /projects`) con tipo y estado de cada proyecto y puede abrir cualquier detalle.
2. **Given** el catálogo, **When** filtra por `type` (Investment/Civic) y/o `status`
   (Funding/Building/Selling/Completed/Cancelled) y avanza de página, **Then** la lista
   refleja los filtros y la paginación.
3. **Given** el detalle de un proyecto (`GET /projects/{address}`), **When** carga,
   **Then** ve fondeo (`fmpa`, `ff`, `totalRaised`, `fundingDeadline`), la lista de hitos
   (estado, `budget`, `deadline`, `retryCount`, `trancheReleased`), el reporte de cada hito
   declarado (`reportUrl` + `reportHash`), el árbitro actual y, en Investment, el precio
   estimado de venta.
4. **Given** un reporte de hito, **When** el usuario abre su verificación
   (`GET /reports/{id}/verification`), **Then** ve `computedHash`, `onChainHash` y
   `hashMatch` tal como los devuelve la API (el frontend no recalcula la huella).
5. **Given** la API caída o un error, **When** el usuario abre una pantalla, **Then** ve un
   estado de error o vacío claro, nunca una pantalla rota.

---

### User Story 2 - Conectar wallet e invertir (Priority: P2)

Un inversor conecta MetaMask (verificando que la red sea Sepolia), invierte SepoliaETH en un
proyecto en `Funding` firmando la transacción **directo contra el contrato del proyecto**, y
luego ve su historial de inversión y su balance.

**Why this priority**: primer flujo que escribe on-chain y la entrada del rol inversor;
habilita la gobernanza y el reparto posteriores.

**Independent Test**: con un proyecto en `Funding`, conectar wallet en Sepolia, invertir un
monto, firmar en MetaMask y, tras confirmar, ver el `totalRaised` y el historial
(`GET /investors/{wallet}/investments`) actualizados.

**Acceptance Scenarios**:

1. **Given** MetaMask instalado, **When** el usuario conecta la wallet, **Then** la app
   muestra la dirección y, si la red no es Sepolia (chainId ≠ 11155111), advierte y ofrece
   cambiar de red, bloqueando las acciones de escritura.
2. **Given** un proyecto en `Funding` y wallet en Sepolia, **When** el inversor confirma un
   monto, **Then** la app abre MetaMask para firmar la transacción de inversión contra el
   contrato del proyecto y, al confirmarse, refleja el nuevo `totalRaised`.
3. **Given** una inversión enviada, **When** está pendiente de confirmación, **Then** la app
   muestra estado "en progreso" y no permite reenviar la misma acción.
4. **Given** el usuario rechaza la firma en MetaMask, **When** cancela, **Then** la app
   vuelve al estado anterior sin error de sistema y permite reintentar.
5. **Given** un inversor con historial, **When** abre su vista, **Then** ve sus inversiones
   por proyecto y lo reclamable hoy (`GET /investors/{wallet}/claimable`).

---

### User Story 3 - Declarar hito y votar en el DAO (Priority: P3)

El desarrollador dueño sube el reporte de un hito al backend (autenticado por firma) y
declara el hito on-chain con la `reportUrl`+`reportHash` que el backend devolvió. Los
tenedores de FDT ven las propuestas activas y votan (hito, elección de árbitro u oferta de
venta) firmando contra el governor.

**Why this priority**: es el corazón de la gobernanza; requiere proyectos con inversores
(P2) e hitos declarables.

**Independent Test**: como developer dueño, subir un reporte (`POST /projects/{address}/
milestones/{index}/report`) y declarar el hito; como tenedor de FDT, sobre una propuesta
`Active`, votar y ver el conteo y el deadline actualizarse.

**Acceptance Scenarios**:

1. **Given** el developer dueño autenticado por firma, **When** sube el reporte de un hito,
   **Then** recibe `{ reportUrl, reportHash }` y puede firmar la declaración del hito contra
   el contrato del proyecto.
2. **Given** una propuesta de hito (`GET /projects/{address}/proposals`, kind `Milestone`,
   status `Active`), **When** el usuario la mira, **Then** ve `deadline`, `quorumBps`,
   `approvalThresholdBps`, `votesFor`/`votesAgainst`, `quorumReached` y su poder de voto
   (`GET …/voting-power?wallet=`, con `hasVoted`).
3. **Given** un tenedor de FDT, **When** vota a favor/en contra, **Then** firma la
   transacción contra el governor y la app refleja su voto y el conteo actualizado por
   sondeo.
4. **Given** una propuesta `ArbiterElection`, **When** está abierta, **Then** el inversor ve
   los candidatos y puede votar; el detalle muestra `electedArbiter` al resolverse.
5. **Given** una propuesta rechazada o sin quórum, **When** el usuario ve el hito, **Then**
   ve `result`, `retryCount` y el estado `AwaitingArbiter`/`Resolved` según la API.

---

### User Story 4 - Identidad y reputación del desarrollador (Priority: P4)

El desarrollador registra/verifica su identidad (razón social, CUIT, material de
verificación off-chain, autenticado por firma) y cualquiera puede ver su reputación
(certificados de finalización y de proyecto fallido) ligada a sus proyectos.

**Why this priority**: da confianza pública sobre quién ejecuta la obra, pero no bloquea los
flujos de inversión/gobernanza; depende del recorrido de lectura (P1).

**Independent Test**: ver la identidad de un developer (`GET /developers/{wallet}`) y su
reputación (`GET /developers/{wallet}/reputation`); como ese mismo developer autenticado,
subir material de verificación (`POST /developers/{wallet}/verification`).

**Acceptance Scenarios**:

1. **Given** un developer, **When** se ve su identidad, **Then** se muestran `razonSocial`,
   `cuit` y, si existe, el material de verificación.
2. **Given** la reputación de un developer, **When** se consulta, **Then** se ven los
   conteos `completed`/`failed` y los certificados (`Completion`/`Failure`) con su proyecto.
3. **Given** el developer dueño autenticado por firma, **When** sube material de
   verificación, **Then** la app confirma la subida o muestra el error del backend.
4. **Given** una wallet que no es ese developer, **When** intenta subir verificación,
   **Then** la acción queda bloqueada (la autorización la resuelve el backend; la app
   refleja el resultado).

---

### User Story 5 - Comprar y repartir la venta (solo Investment) (Priority: P5)

Un comprador externo ve los proyectos en `Selling` (vista restringida), oferta firmando un
depósito contra el contrato, y el grupo de vendedores vota la oferta. Al ejecutarse la
venta, cada inversor reclama su parte proporcional del reparto.

**Why this priority**: cierra el ciclo de vida de un proyecto Investment; depende de todo lo
anterior.

**Independent Test**: como comprador, ver solo `GET /projects/buyer-view`; ofertar firmando
el depósito; ver el reparto (`GET /projects/{address}/distribution`) y, como inversor,
reclamar.

**Acceptance Scenarios**:

1. **Given** un comprador, **When** abre su catálogo (`GET /projects/buyer-view`), **Then**
   solo ve proyectos en `Selling`, nunca en construcción ni cancelados.
2. **Given** un proyecto en `Selling`, **When** el comprador oferta un monto, **Then** firma
   el depósito contra el contrato y la oferta aparece (`GET /projects/{address}/offers`) con
   `status` `Voting`.
3. **Given** una oferta superada o rechazada, **When** el comprador la mira, **Then** ve su
   `status` (`Rejected`/`Refunded`) y que el depósito se reembolsó.
4. **Given** ofertas activas, **When** un inversor o el developer las mira, **Then** puede
   votarlas (propuesta `SaleOffer`) firmando contra el governor.
5. **Given** una venta ejecutada (`status` de oferta `Executed`), **When** un inversor
   reclama, **Then** firma el reclamo contra el contrato, ve su parte (`distribution.shares`
   → `claimable`) y que su FDT se quemó.

---

### Edge Cases

- **Sin MetaMask**: todo lo de solo lectura sigue disponible; al intentar firmar, la app
  indica que se necesita una wallet y cómo conectarla.
- **Red equivocada (chainId ≠ 11155111)**: las acciones de escritura se bloquean con un
  aviso para cambiar a Sepolia; la lectura sigue.
- **Firma rechazada o tx fallida**: la app vuelve al estado previo con mensaje claro y opción
  de reintentar; sin estados a medias.
- **Estado on-chain aún no espejado**: tras confirmarse una tx, el dato puede tardar en
  aparecer en la API (el backend procesa eventos con N confirmaciones); la app comunica que
  el cambio se está propagando en lugar de leer la cadena directamente.
- **Cambio de cuenta/red en MetaMask**: la app actualiza identidad, rol y acciones sin
  recargar.
- **Sesión de firma expirada** (nonce TTL): al intentar una escritura off-chain, la app pide
  volver a firmar el login.
- **Proyecto `Cancelled`**: la app muestra el estado terminal y, si corresponde, el refund
  reclamable (`claimable`, tipo `Refund`), sin ofrecer acciones inválidas.

## Requirements *(mandatory)*

### Functional Requirements

#### Identidad y wallet

- **FR-001**: La app MUST permitir conectar/desconectar MetaMask y mostrar la dirección
  conectada.
- **FR-002**: La app MUST detectar la red (chainId) y advertir cuando no sea Sepolia
  (11155111), bloqueando las acciones de escritura hasta corregirla.
- **FR-003**: La app MUST permitir toda la navegación de solo lectura sin wallet conectada.
- **FR-004**: La app MUST autenticar al usuario ante el backend para escrituras off-chain
  vía firma de wallet (`POST /auth/nonce` → firmar el `message` → `POST /auth/verify`),
  adjuntando la credencial resultante (`Authorization: Wallet <…>`) en esas peticiones.
- **FR-005**: La app MUST derivar el rol mostrado (developer, inversor, árbitro, comprador,
  visitante) de la relación de la wallet con cada proyecto según la API, sin login con
  contraseña.

#### Catálogo, detalle y reportes (lectura)

- **FR-006**: La app MUST listar proyectos (`GET /projects`) con tipo y estado, filtrables
  por `type` y `status` y paginados (`page`, `pageSize`).
- **FR-007**: Para el rol comprador, la app MUST usar `GET /projects/buyer-view` y mostrar
  únicamente proyectos en `Selling`.
- **FR-008**: La app MUST mostrar el detalle de un proyecto (`GET /projects/{address}` y
  `/milestones`): fondeo (`fmpa`, `ff`, `totalRaised`, `totalReleasedToDeveloper`,
  `fundingDeadline`), tipo, `votingMode`, estado, `currentArbiter`, `currentMilestoneIndex`,
  `estimatedSalePrice`/`salePrice`, y los hitos con `status`, `budget`, `deadline`,
  `retryCount`, `trancheReleased`, `reportHash`/`reportUrl`, `proposalId`.
- **FR-009**: La app MUST mostrar el reporte de un hito (`GET /reports/{id}`) y su
  verificación (`GET /reports/{id}/verification`: `computedHash`, `onChainHash`, `hashMatch`)
  tal como los entrega la API; no recalcula la huella.

#### Acciones on-chain (firma directa contra contratos)

- **FR-010**: La app MUST permitir a un inversor invertir en un proyecto en `Funding`
  firmando la transacción contra el contrato del proyecto, y reflejar `totalRaised`/historial
  una vez confirmada.
- **FR-011**: La app MUST mostrar el historial de inversión (`GET /investors/{wallet}/
  investments`) y lo reclamable hoy (`GET /investors/{wallet}/claimable`, tipos `Refund`/
  `Distribution`).
- **FR-012**: La app MUST permitir crear un proyecto firmando contra el `FenrirFactory`
  (dirección desde variable de entorno), con tipo, hitos (presupuesto por tranche) y precio
  estimado de venta (solo Investment).
- **FR-013**: La app MUST permitir al developer dueño subir el reporte de un hito
  (`POST /projects/{address}/milestones/{index}/report`, autenticado) y luego declarar el
  hito on-chain con la `reportUrl`+`reportHash` devueltas.
- **FR-014**: La app MUST mostrar las propuestas de un proyecto (`GET …/proposals` y
  `/proposals/{id}`) con `kind`, `deadline`, `quorumBps`, `approvalThresholdBps`,
  `votesFor`/`votesAgainst`, `quorumReached`, `status`, `result`, y el poder de voto del
  usuario (`…/voting-power?wallet=`, con `hasVoted`).
- **FR-015**: La app MUST permitir votar una propuesta (`Milestone`, `ArbiterElection` o
  `SaleOffer`) firmando contra el governor, mostrando candidatos cuando el kind sea
  `ArbiterElection`.
- **FR-016**: La app MUST permitir a un comprador ofertar sobre un proyecto en `Selling`
  firmando el depósito contra el contrato, y mostrar las ofertas (`GET …/offers`) con su
  `status`.
- **FR-017**: La app MUST mostrar el reparto (`GET /projects/{address}/distribution`:
  `salePrice`, `distributionPool`, `shares` con `claimable`) y permitir a un inversor
  reclamar su parte firmando contra el contrato.

#### Identidad y reputación del developer

- **FR-018**: La app MUST mostrar la identidad de un developer (`GET /developers/{wallet}`:
  `razonSocial`, `cuit`, `verificationDocsUrl`) y su reputación
  (`GET /developers/{wallet}/reputation`: `completed`, `failed`, certificados
  `Completion`/`Failure`).
- **FR-019**: La app MUST permitir al developer dueño subir material de verificación
  (`POST /developers/{wallet}/verification`, autenticado por firma) y reflejar el resultado.

#### Comportamiento transversal

- **FR-020**: Para cada transacción on-chain, la app MUST mostrar estado de progreso
  (pendiente de firma, en confirmación, propagándose, confirmada o fallida) y MUST evitar el
  reenvío duplicado mientras una está pendiente.
- **FR-021**: La app MUST manejar el rechazo/fallo de una firma volviendo al estado anterior
  con mensaje claro y opción de reintentar.
- **FR-022**: La app MUST presentar estados de carga, vacío y error claros cuando la API no
  responde o devuelve `{ error, error_code, details? }`, sin romper la pantalla.
- **FR-023**: Mientras una propuesta u oferta esté activa, la app MUST refrescar su conteo y
  tiempo restante por sondeo (polling) al backend, sin requerir recarga manual.
- **FR-024**: La app MUST NOT calcular ni replicar decisiones de negocio (montos, comisión,
  quórum, elegibilidad de voto, validez de CUIT); solo refleja lo que la API y los contratos
  resuelven. Sus validaciones se limitan a formato/campos requeridos, reutilizando los Zod
  schemas de `shared/`.
- **FR-025**: La app MUST reflejar cambios de cuenta/red de la wallet actualizando identidad
  y acciones disponibles sin recargar.
- **FR-026**: La app MUST reutilizar los tipos, enums y Zod schemas de `shared/` (vía el
  alias `@shared/*` ya configurado) y MUST NOT redefinir copias locales de esos contratos.

### Key Entities *(include if data involved)*

Las formas canónicas ya existen como tipos/Zod en `shared/`; el frontend las importa.

- **Project / ProjectDetail** (`projectResponseSchema`, `projectDetailResponseSchema`):
  direcciones (`address`, `tokenAddress`, `governorAddress`, `developerWallet`), `projectType`,
  `votingMode`, `status`, fondeo, `estimatedSalePrice`/`salePrice`, `currentArbiter`,
  `currentMilestoneIndex`, y `milestones[]`.
- **Milestone** (`milestoneResponseSchema`): `milestoneIndex`, `budget`, `deadline`, `status`,
  `retryCount`, `trancheReleased`, `reportHash`, `reportUrl`, `proposalId`.
- **Proposal / VotingPower / Arbiter** (`proposalResponseSchema`, `votingPowerResponseSchema`,
  `arbiterResponseSchema`): gobernanza de hitos, árbitro y ofertas.
- **Investment / Claimable / Distribution** (`investmentResponseSchema`,
  `claimableResponseSchema`, `distributionResponseSchema`): participación y reparto.
- **SaleOffer** (`saleOfferResponseSchema`): oferta de compra y su estado.
- **Developer / Reputation / Certificate** (`developerResponseSchema`,
  `reputationResponseSchema`, `certificateResponseSchema`): identidad y reputación.
- **Auth** (`nonceResponseSchema`, `verifyResponseSchema`): login por firma.
- **Wallet/Session** (estado de cliente): dirección conectada, chainId, `isOnSepolia`, sesión
  de firma activa.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visitante sin conocimientos técnicos encuentra un proyecto y entiende su
  etapa en menos de 1 minuto, sin conectar wallet.
- **SC-002**: El 100% de los datos que la app muestra proviene de la API del backend;
  ninguna cifra ni decisión de negocio se calcula en `client/`.
- **SC-003**: Un inversor completa una inversión —desde abrir el proyecto hasta ver
  `totalRaised`/historial actualizados— en menos de 2 minutos, incluida la confirmación
  on-chain.
- **SC-004**: Cada uno de los cinco roles (developer, inversor, árbitro, comprador y
  visitante) completa su acción principal de punta a punta sin asistencia externa.
- **SC-005**: Ante tx rechazada, API caída o red equivocada, la app comunica el problema y
  ofrece una salida (reintentar / cambiar de red / conectar wallet) en el 100% de esos casos,
  sin pantallas rotas.
- **SC-006**: Un comprador nunca ve, en ninguna pantalla, proyectos que no estén en `Selling`.

## Assumptions

- El backend de `specs/001-express-backend-server` y los contratos de `shared/` ya existen y
  son la fuente de verdad de la forma de los datos y de los endpoints disponibles.
- El frontend se construye sobre Sepolia (chainId 11155111); no maneja dinero real (seminario
  universitario).
- Identidad = wallet MetaMask; sin login con usuario/contraseña ni recuperación de wallet.
- Idioma de la interfaz: español; los valores de estado son los enums (en inglés) de
  `shared/`.
- Las direcciones de los contratos por proyecto vienen de la API; la del `FenrirFactory`
  viene de una variable de entorno del frontend.
- Las ABIs de los contratos (`contracts/*.sol`) están disponibles para el frontend (artefacto
  compilado/ABI JSON) para poder firmar las acciones on-chain.
- Foco en navegador de escritorio con MetaMask; experiencia móvil fuera de alcance.

## Dependencies

- **API del backend (`server/`)** según `specs/001-express-backend-server/contracts/openapi.md`.
- **Contratos de forma compartidos (`shared/`)** vía alias `@shared/*`.
- **Smart contracts en Sepolia** (ABIs + direcciones) para firmar las acciones on-chain.
- **MetaMask** (o wallet EIP-1193 compatible) en el navegador.
