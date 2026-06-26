# Phase 0 — Research: Frontend de Fenrir (client/)

El stack base (React + TS + Tailwind + shadcn/ui + Axios, deploy en Vercel) lo fija la
constitución. La arquitectura de lectura/escritura la fija el backend ya implementado. Acá
se resuelven las decisiones que quedaban abiertas.

---

## D1 — Stack web3: ethers v6 crudo (decidido en clarify)

**Decision**: usar **ethers v6** directamente, sin wagmi ni RainbowKit. El provider sale de
`window.ethereum` con `new ethers.BrowserProvider(window.ethereum)`; el signer con
`provider.getSigner()`. Las escrituras se hacen con `new ethers.Contract(address, abi,
signer)` y el método correspondiente (`invest`, `castVote`, `declareMilestone`,
`submitOffer`, `claim`, etc.). Todo esto vive **solo** en `src/lib/chain/`; los componentes
nunca importan ethers.

**Rationale**: el backend exige firma directa contra los contratos (no prepara tx). ethers
v6 es la librería estándar, ya usada del lado del backend para el listener, así que el
equipo comparte vocabulario (`BrowserProvider`, `Contract`, `parseEther`). Mantenerla
aislada en `lib/chain/` preserva el Principio II/III: los componentes siguen "tontos".

**Alternatives considered**:
- *wagmi + viem*: más ergonómico en React pero agrega capa de hooks/estado y un segundo
  modelo mental; el usuario eligió ethers crudo.
- *RainbowKit*: traería UI de conexión fuera de shadcn/ui (roza Principio III). Descartado.

---

## D2 — Aislamiento de ethers y obtención de ABIs/direcciones

**Decision**: `src/lib/chain/` expone funciones de dominio (`investInProject(projectAddr,
amountWei)`, `castVote(governorAddr, proposalId, support)`, `declareMilestone(...)`,
`submitOffer(...)`, `claim(...)`, `createProject(...)`). Las **direcciones** de project/
token/governor vienen de la respuesta de la API (`projectResponseSchema`); la del
`FenrirFactory` de `VITE_FENRIR_FACTORY_ADDRESS`. Las **ABIs** se guardan como JSON en
`src/lib/chain/abis/` (artefacto exportado de los `.sol`; el repo compila en Remix, así que
el ABI se copia a mano cuando cambia el contrato).

**Rationale**: separa "qué acción" (función de dominio que llaman los hooks) de "cómo se
codifica" (ethers + ABI), de modo que un cambio de ABI toca un solo lugar. Reutiliza las
direcciones que la API ya entrega en vez de duplicar un registro.

**Alternatives considered**:
- *ABIs importadas de un paquete de contratos compilado*: no hay pipeline de compilación en
  el repo (Principio IV, deploy manual por Remix); copiar el ABI JSON es coherente con eso.

---

## D3 — Data fetching, caché y polling

**Decision**: TanStack Query sobre la única instancia de Axios. Los `services/` son la única
vía a la API; los hooks envuelven esos services en `useQuery`/`useMutation`. Polling con
`refetchInterval` activo solo mientras una propuesta es `Active` o una oferta es `Voting`,
apagado al resolverse. Estados de carga/vacío/error (FR-022) salen del estado de cada query.

**Rationale**: FR-023 pide refresco por polling de conteo/tiempo; FR-020/FR-022 piden
estados de progreso/carga/error consistentes en muchas pantallas. React Query resuelve
caché, dedupe, polling e invalidación tras una escritura con poco código. No es un segundo
cliente HTTP (sigue usando `lib/api.ts`), así que no viola el Principio III.

**Alternatives considered**:
- *fetch propio con `useEffect`/`setInterval`*: reimplementa caché/polling/invalidación a
  mano en cada pantalla. Descartado.

---

## D4 — Confirmación de tx y estado "propagándose"

**Decision**: tras enviar una escritura, esperar el recibo con `tx.wait(1)` (ethers) para
saber que se minó; luego mostrar estado "propagándose" e invalidar/re-consultar la query del
recurso afectado con reintentos espaciados hasta que el backend (que espera N
confirmaciones) refleje el cambio. Nunca leer el resultado on-chain para poblar la UI.

**Rationale**: respeta el Principio I y el caso borde "estado on-chain aún no espejado". El
backend usa `INGESTION_CONFIRMATIONS=5`, así que hay una ventana entre el minado y el
reflejo; comunicarla evita mostrar datos inconsistentes.

---

## D5 — Autenticación por firma de wallet (escrituras off-chain)

**Decision**: `auth.service.ts`: `POST /auth/nonce {wallet}` → firmar el `message` con
`signer.signMessage(message)` → `POST /auth/verify {wallet, signature}`. La credencial
resultante se adjunta como `Authorization: Wallet <…>` mediante un interceptor de la
instancia única de Axios, solo en las rutas que lo requieren (subida de reporte, material de
verificación). `SessionProvider` expone si hay sesión para la wallet conectada; si el nonce
expira (TTL del backend), se vuelve a firmar.

**Rationale**: es el esquema que el backend ya implementa (`walletAuth`). Mantener la
credencial en memoria (no `localStorage`) reduce exposición.

---

## D6 — Desarrollo sin depender del backend corriendo

**Decision**: MSW intercepta las rutas de `contracts/api.md` devolviendo datos que validan
contra los Zod de `shared/`; activado por `VITE_USE_MOCK`. Las escrituras on-chain en modo
mock se pueden simular con una wallet de Sepolia real (los contratos están desplegados) o
stubear la capa `lib/chain` detrás de una flag para demos sin gas.

**Rationale**: permite construir y demostrar P1–P5 sin levantar `server/`, y al interceptar
a nivel HTTP garantiza que el contrato que se prueba es el real. Los componentes no saben si
responde MSW o el backend.

---

## D7 — Routing, formularios y composición de UI

**Decision**: React Router para navegación por pantalla; react-hook-form + `@hookform/
resolvers` con los Zod de `shared/` para validar formato (crear proyecto, montos, oferta,
texto de reporte con `createReportBodySchema`). Componentes de dominio reutilizables
(`ProjectCard`, `MilestoneList`, `VotePanel`, `OfferCard`) extraídos a la segunda repetición
(regla de 2 del skill `frontend-developer`). Montos en wei (string) → helpers de formato a
ETH como presentación pura (`ethers.formatEther`/`parseEther` dentro de `lib/chain` o un
util de formato).

**Rationale**: shadcn/ui integra con react-hook-form + Zod; reutilizar los schemas de
`shared/` cumple Principio II/III. React Router alcanza para una SPA sin SSR.

---

## Resumen

| ID | Decisión |
|----|----------|
| D1 | ethers v6 crudo, aislado en `lib/chain/`; sin wagmi/RainbowKit |
| D2 | Funciones de dominio en `lib/chain/`; direcciones de la API, factory por env, ABIs JSON locales |
| D3 | TanStack Query sobre la única instancia de Axios; polling acotado a recursos activos |
| D4 | `tx.wait(1)` + estado "propagándose" + re-consulta al backend; nunca leer la cadena para la UI |
| D5 | Auth por firma (`/auth/nonce`→sign→`/auth/verify`), credencial en memoria vía interceptor |
| D6 | MSW contra los Zod de `shared/`; escrituras vía wallet real o stub de `lib/chain` |
| D7 | React Router + react-hook-form + Zod(`shared/`) + shadcn/ui; componentes de dominio (regla de 2) |

Sin `NEEDS CLARIFICATION` pendientes.
