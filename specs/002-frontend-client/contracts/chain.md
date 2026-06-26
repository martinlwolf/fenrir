# Contrato — Interacción on-chain con ethers v6

Toda la interacción con la cadena vive en `src/lib/chain/` y se expone como funciones de
dominio que consumen los hooks/services de escritura. Los **componentes no importan ethers**.
Provider/signer salen de `window.ethereum`; las direcciones por proyecto vienen de la API
(`project.address`/`tokenAddress`/`governorAddress`), la del factory de
`VITE_FENRIR_FACTORY_ADDRESS`. ABIs en `src/lib/chain/abis/*.json` (copiadas del artefacto
de compilación de Remix; el repo no compila contratos — Principio IV).

## Provider y red (`lib/chain/provider.ts`)

| Operación | ethers v6 |
|---|---|
| Detectar wallet | `window.ethereum` presente; si no, modo solo-lectura |
| Conectar | `await provider.send("eth_requestAccounts", [])` con `new BrowserProvider(window.ethereum)` |
| Signer | `await provider.getSigner()` |
| Red actual | `(await provider.getNetwork()).chainId` vs `VITE_SEPOLIA_CHAIN_ID` (11155111) |
| Cambiar a Sepolia | `provider.send("wallet_switchEthereumChain", [{ chainId: "0xaa36a7" }])` (fallback `wallet_addEthereumChain`) |
| Firmar login (SIWE) | `await signer.signMessage(message)` (D5) |
| Eventos | `window.ethereum.on("accountsChanged" \| "chainChanged", …)` (FR-025) |

## Funciones de escritura (`lib/chain/contracts.ts`) — firmas reales

> Patrón: `const c = new ethers.Contract(addr, abi, signer); const tx = await c.fn(...);
> await tx.wait(1);` → luego estado "propagándose" + re-consulta al backend (D4).

### FenrirFactory (`VITE_FENRIR_FACTORY_ADDRESS`)

| Intención | Función |
|---|---|
| Registrar developer (on-chain) | `registerDeveloper(razonSocial: string, cuit: string)` |
| Crear proyecto | `createProject(tokenName, tokenSymbol, projectType, votingMode, fmpa, ff, fundingDeadline, milestoneBudgets[], milestoneDurations[], estimatedSalePrice)` → devuelve `projectAddress` |

> `createProject` requiere developer registrado on-chain; Investment exige `votingMode = ByToken`.

### FenrirProject (`project.address`)

| Intención | Función |
|---|---|
| Invertir | `invest()` **payable** (`value` = monto en wei) |
| Declarar hito | `declareMilestone(reportHash: bytes32, reportUrl: string)` (usa el output de `POST …/report`) |
| Ofertar (comprador) | `submitOffer()` **payable** (`value` = depósito) → `offerId` |
| Reclamar refund | `claimRefund()` (proyecto `Cancelled`) |
| Reclamar reparto | `claimDistribution()` (venta ejecutada; quema FDT) |
| Reclamar comisión (developer) | `claimCommission()` |
| Ejecutar venta | `executeSale()` |

### FenrirGovernor (`project.governorAddress`)

| Intención | Función |
|---|---|
| Votar hito | `castVote(proposalId, support: bool)` |
| Votar oferta de venta (developer) | `castDeveloperSaleVote(proposalId, support: bool)` |
| Votar elección de árbitro | `castElectionVote(proposalId, candidate: address)` |
| Resolver propuesta vencida | `resolve(proposalId)` |
| Decisión de árbitro (desempate/quórum) | `arbiterDecide(proposalId, approve: bool)` (solo árbitro) |

## Reglas de borde (de la spec)

- **Sin `window.ethereum`**: lectura disponible; al firmar, CTA para instalar/conectar (FR-003).
- **Red ≠ Sepolia**: escritura bloqueada con CTA "cambiar a Sepolia" (FR-002).
- **Firma rechazada / tx revertida**: `try/catch` alrededor de `c.fn()`/`tx.wait()`, volver al
  estado previo con mensaje y reintento; sin estados a medias (FR-021).
- **Montos**: se pasan en wei (`bigint`/string), p.ej. `ethers.parseEther(input)`; el formateo a
  ETH es presentación (`ethers.formatEther`). El frontend no decide montos de negocio.

## Flujo de una acción on-chain

1. Componente dispara la intención → hook `useWrite` llama la función de dominio de `lib/chain`.
2. `lib/chain` verifica red Sepolia, arma `ethers.Contract(addr, abi, signer)` y envía la tx.
3. `await tx.wait(1)` (minada) → fase "propagándose".
4. Invalidar la query del recurso afectado (TanStack Query) y re-consultar hasta que el
   backend (con `INGESTION_CONFIRMATIONS`) refleje el cambio (D4).
