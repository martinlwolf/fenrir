# FENRIR

## Fideicomiso descentralizado en blockchain

> Documento de diseño conceptual — Red: Ethereum, Sepolia Testnet

---

## 1. Qué problema resuelve

En un fideicomiso tradicional, los inversores le entregan su dinero a un **fiduciario humano** (un banco o una fiduciaria) y confían en que ese tercero administre los fondos con honestidad: que libere el dinero de la obra solo cuando cada etapa realmente se cumplió, que no se quede con lo que no le corresponde y que rinda cuentas. Ese modelo tiene tres costos estructurales:

- **Confianza en un intermediario opaco.** El inversor no puede verificar por su cuenta qué pasó con su plata; depende de los informes que el propio fiduciario decide mostrar.
- **El fiduciario decide solo.** Quién aprueba que una etapa se cumplió es el intermediario, no los aportantes.
- **Costo y fricción.** El intermediario cobra por administrar y arbitrar, y agrega demoras.

**Fenrir reemplaza al fiduciario humano por smart contracts y un DAO.** En vez de que un banco administre los fondos y decida cuándo liberarlos, son los propios inversores quienes votan —de forma **pública y verificable**— si cada etapa de la obra se cumplió, y el contrato libera el presupuesto automáticamente según ese voto. Una sola fábrica de contratos (`FenrirFactory`) crea, sobre la misma infraestructura, dos tipos de proyecto:

- **Fenrir Inversión** — con fines de lucro: se vende el inmueble al terminar y se reparte la ganancia entre los inversores.
- **Fenrir Cívico** — sin fines de lucro: obra pública o vecinal, sin retorno económico.

El sistema se desarrolla y se demuestra sobre **Sepolia** (testnet de Ethereum); es un proyecto de seminario universitario, no maneja dinero real.

---

## 2. Por qué blockchain es la arquitectura adecuada y no una app tradicional

El problema de Fenrir es, en su núcleo, **custodiar dinero de terceros y liberarlo según una decisión colectiva, sin que nadie pueda hacer trampa y sin tener que confiar en el operador del sistema**. Una app tradicional (backend + base de datos) no puede dar esa garantía, y acá está el porqué punto por punto:

| Propiedad que el problema exige | App tradicional | Blockchain (Fenrir) |
|---|---|---|
| **Custodia sin intermediario de confianza** | El servidor que guarda el saldo *es* un nuevo fiduciario; hay que confiar en quien lo opera. Reintroduce exactamente el problema que queremos eliminar. | El ETH lo custodia el **contrato**, no una empresa. Las reglas de liberación están en el código y nadie —ni los desarrolladores de Fenrir— puede saltearlas. |
| **Reglas que no se pueden cambiar a mitad de camino** | El dueño de la base de datos puede editar un saldo o cambiar la lógica de liberación sin que nadie se entere. | El contrato desplegado es **inmutable**: la fórmula de comisión, el quórum, las tranches por hito están fijadas y son auditables por cualquiera. |
| **Verificabilidad pública del voto** | "Confiá en que contamos bien los votos." No hay forma de auditar desde afuera. | Cada voto es una transacción on-chain firmada; **cualquiera puede recontar** y comprobar el resultado contra el estado del contrato. |
| **Liquidación automática y sin disputa** | Pagar exige una orden manual de alguien con autoridad → punto de captura y demora. | Aprobado el hito, el contrato **libera la tranche solo** (`_releaseTranche`). El reparto de la venta y los reembolsos se ejecutan por código, no por decisión de una persona. |
| **Propiedad económica transferible** | "Salir antes" exige que el operador procese y autorice la transferencia. | El derecho económico + voto es un **token ERC-20 (FDT)**: el inversor lo vende en un mercado secundario sin pedirle permiso a nadie. |
| **Reputación portable entre proyectos** | Vive en la base de datos privada de la empresa; no es comprobable ni portable. | El historial de éxitos y fracasos del desarrollador son **NFTs soulbound** en su wallet, consultables por cualquier inversor antes de invertir. |

En síntesis: el valor de Fenrir es **eliminar la necesidad de confiar en un intermediario**. Cualquier arquitectura centralizada vuelve a meter ese intermediario por la puerta de atrás —el operador del servidor—. Blockchain es la única arquitectura donde *la custodia, las reglas y el conteo de votos no dependen de la honestidad de nadie en particular*, sino de un código público y un consenso de red. Donde el problema **no** exige esa garantía (mostrar fotos de la obra, indexar para buscar rápido), Fenrir usa deliberadamente infraestructura tradicional, porque la blockchain ahí solo agregaría costo (ver §5).

---

## 3. Roles del sistema

| Rol | Quién lo ocupa | Función |
|---|---|---|
| **Desarrollador / Constructora** | Empresa o persona que ejecuta la obra | Declara cada hito, recibe el presupuesto liberado por hito y una comisión final |
| **Inversor / Vecino** | Quien aporta fondos | Recibe FDT y vota cada hito en el DAO |
| **DAO** | El conjunto de tenedores de FDT de un proyecto | Aprueba o rechaza cada hito por votación on-chain |
| **Árbitro** | **Un inversor más**, elegido por el DAO en el hito 0 (wallet normal, sin multisig; en la demo de clase, el profesor) | Resuelve **solo** falta de quórum y empates. **No** hay apelación de votos |
| **Comprador** | Wallet externa, sin relación previa con el proyecto (solo Inversión) | Ve únicamente proyectos en etapa de venta; hace ofertas que disparan una votación |

El desarrollador **no puede invertir en su propio proyecto**, por lo que tampoco puede ser candidato a árbitro. Su identidad no es anónima: registra como mínimo razón social y CUIT antes de poder crear un proyecto (verificación off-chain, se valida el dígito verificador; la primera wallet que registra un CUIT queda atada a él, para que un desarrollador no abandone una wallet manchada por fracasos y arranque de cero). Los inversores siguen siendo anónimos: alcanza con conectar una wallet.

---

## 4. Arquitectura técnica: contratos, funciones y tokens

### 4.1 Una Factory, cuatro contratos por proyecto

`FenrirFactory` es el **único punto de entrada**. Por cada proyecto que se crea, despliega tres instancias vinculadas entre sí (Token, Governor, Project). Esto mantiene los fondos y la gobernanza de cada proyecto **aislados**: un proyecto no puede tocar el ETH ni los votos de otro.

```
                    ┌───────────────────────────────────────────┐
                    │              FenrirFactory                 │
                    │  registro de developers + reputación NFT   │
                    └───────────────────┬───────────────────────┘
                                        │ createProject(...)
                 despliega y vincula (1 set por proyecto)
            ┌───────────────────┬───────────────┴────────────────┐
            ▼                   ▼                                 ▼
    ┌───────────────┐   ┌───────────────┐                ┌────────────────┐
    │  FenrirToken  │   │ FenrirGovernor│                │  FenrirProject │
    │   (FDT, ERC20)│◀─▶│ (votación +   │◀──callbacks──▶ │ (custodia ETH, │
    │  voto+economía│   │  ERC-1155     │                │  hitos, venta) │
    └───────────────┘   │  insignias)   │                └────────────────┘
                        └───────────────┘
```

### 4.2 `FenrirFactory.sol` — entrada y registro de reputación

Punto de entrada y registro global de reputación del desarrollador (la reputación se consulta a través de **todos** sus proyectos, no por proyecto).

| Función | Quién la llama | Qué hace |
|---|---|---|
| `registerDeveloper(razonSocial, cuit)` | Desarrollador | Registra identidad off-chain mínima; valida el dígito verificador del CUIT; ata el CUIT a una sola wallet |
| `createProject(tokenName, tokenSymbol, projectType, votingMode, fmpa, ff, fundingDeadline, milestoneBudgets[], milestoneDurations[], milestoneDescriptions[], estimatedSalePrice)` | Desarrollador registrado | Despliega y vincula Token + Governor + Project para un proyecto nuevo |
| `recordSuccess(developer)` / `recordFailure(developer)` | Solo un proyecto conocido | Mintea el certificado de finalización / de fracaso correspondiente |
| `projectsCount()` | Cualquiera (lectura) | Cantidad de proyectos creados |

La Factory **es dueña** de los dos contratos ERC-721 soulbound de reputación (`FenrirCompletionCertificate` y `FenrirFailureCertificate`) y es la única que puede mintearlos.

### 4.3 `FenrirToken.sol` — FDT (ERC-20 de inversión y gobernanza)

ERC-20 extendido con `ERC20Votes` (snapshot de poder de voto) y `ERC20Permit`. Una instancia por proyecto.

| Función | Quién la llama | Qué hace |
|---|---|---|
| `mint(to, amount)` | Solo el Project | Emite FDT al invertir, **1 wei de ETH : 1 wei de FDT** |
| `projectBurn(account, amount)` | Solo el Project | Quema FDT al reclamar reembolso o reparto (evita doble reclamo) |
| `getPastVotes` / `getPastTotalSupply` | Governor (lectura) | Saldo "fotografiado" (snapshot) en el **bloque anterior** al de creación de cada propuesta (`block.number − 1`) |
| `holdersCount()` / `holderAt(i)` | Governor (lectura) | Padrón de holders, usado para la elección de árbitro al azar |
| `transfer` / `approve` / `balanceOf` (ERC-20 estándar) | Cualquiera | FDT **transferible** → mercado secundario para "salir antes" |

Detalle de diseño: al recibir FDT por primera vez, la wallet se **auto-delega** el voto, así sus tokens cuentan sin un paso manual. Si el árbitro electo transfiere todo su FDT, el token avisa al Governor (`notifyArbiterDivested`) y se dispara una nueva elección.

### 4.4 `FenrirGovernor.sol` — motor de votación (e insignias ERC-1155)

Motor de votación a medida —inspirado en el patrón **Governor de OpenZeppelin**, pero no lo extiende— porque las reglas de Fenrir (cierre anticipado al 100% de participación, elección de árbitro por pluralidad, desempate por árbitro o al azar, ofertas de venta concurrentes) no encajan en el flujo binario estándar. El propio contrato **es un ERC-1155**: mintea una insignia de participación a cada wallet que vota.

| Función | Quién la llama | Qué hace |
|---|---|---|
| `proposeArbiterElection()` / `proposeMilestone(id)` / `proposeSaleOffer(id)` | Solo el Project | Abre una propuesta (elección de árbitro / hito / oferta de venta) |
| `castVote(proposalId, support)` | Inversor (FDT) | Voto binario Sí/No en un hito o una oferta de venta |
| `castDeveloperSaleVote(proposalId, support)` | Desarrollador | Vota una oferta de venta con peso fijo = 1 FDT, sin veto |
| `castElectionVote(proposalId, candidate)` | Inversor (FDT) | Vota un candidato a árbitro (el desarrollador no puede ser candidato) |
| `resolve(proposalId)` | Cualquiera, tras el deadline | Cierra la votación: resuelve, extiende una vez por falta de quórum, o la deja esperando al árbitro |
| `arbiterDecide(proposalId, approve)` | Solo el árbitro | Destraba una propuesta trabada por empate o falta de quórum persistente |
| `notifyArbiterDivested()` | Solo el Token | Vaca el rol de árbitro y abre una nueva elección |

Parámetros de gobernanza, **fijos para todo el sistema** (`FenrirConstants.sol`): **quórum 51%**, **umbral de aprobación 51%**, período de votación corto con **cierre anticipado si vota el 100% del FDT en circulación**. Modo de voto configurable por proyecto: `ByToken` (1 FDT = 1 voto) u `OneWalletOneVote` (1 wallet = 1 voto, permitido solo en Cívico).

### 4.5 `FenrirProject.sol` — custodia de fondos y ciclo de vida

Custodia el ETH **en tranches por hito** y conduce todo el ciclo de vida: fondeo, hitos de obra (declaración/votación/reintentos) y —solo en Inversión— la venta final con reparto proporcional.

| Función | Quién la llama | Qué hace |
|---|---|---|
| `invest()` `payable` | Inversor | Aporta ETH, mintea FDT; al cruzar el FMPA habilita el arranque de la obra (Hito 0, abierto aparte con `openArbiterElection`), al cruzar el FF cierra la ronda |
| `cancelExpiredFunding()` | Cualquiera | Si no se alcanzó el FMPA dentro del TTL → cancela y habilita reembolso del **100%** |
| `openArbiterElection()` | Cualquiera | Abre el hito 0 (elección de árbitro) en un bloque **posterior** al del FMPA, para que el snapshot incluya a todos los que fondearon |
| `declareMilestone(reportHash, reportUrl)` | Desarrollador | Declara un hito (hash + URL del reporte) e intenta abrir su votación |
| `cancelStalledMilestone()` | Inversor | Cancela el proyecto si el desarrollador no declaró antes del deadline o si quedó pausado por falta de fondos |
| `submitOffer()` `payable` | Comprador | Deposita una oferta de compra → dispara su propia votación de venta |
| `executeSale()` | Cualquiera | Concreta la venta con la **mejor oferta aprobada**; reembolsa las demás |
| `claimRefund()` | Inversor | Reclama su parte proporcional del reembolso (quema su FDT) |
| `claimDistribution()` | Inversor | Reclama su parte proporcional del reparto de la venta (quema su FDT) |
| `claimCommission()` | Desarrollador | Cobra la comisión final, menos las penalizaciones acumuladas |

Reglas económicas clave:

- **Tranches.** El presupuesto se divide en una tranche por hito. La del **primer hito de obra** se libera automáticamente al arrancar (capital inicial, sin depender de ningún voto); las demás se liberan al **aprobarse** ese hito, siempre que ya se haya recaudado el monto acumulado que la cubre (si la ronda va más lenta que la obra, la liberación queda pendiente hasta completarlo).
- **Comisión y penalización.** Comisión final **10%** (sobre el precio de venta en Inversión; sobre lo recaudado en Cívico). Cada hito rechazado descuenta una porción fija de la comisión, de forma acumulativa: `comisión / (cantidad_de_hitos × tope_de_reintentos)`. La comisión nunca es negativa. No hay depósito de garantía inicial.
- **Reintentos.** Hasta **2 reintentos por hito** (3 votaciones); contador independiente por hito. Agotados los reintentos, o vencido el plazo de 1 día, el proyecto se cancela.
- **Venta (solo Inversión).** Cada oferta deposita su monto y dispara una votación; votan inversores (FDT) y el desarrollador (peso 1 FDT). El **precio mínimo es solo informativo: el contrato NO rechaza ofertas por debajo de ese valor** —lo decide la votación—. Pueden coexistir varias ofertas; si más de una se aprueba, se ejecuta la de mayor precio y las demás se reembolsan.

### 4.6 Resumen de tokens

| Activo | Estándar | Rol | Transferible |
|---|---|---|---|
| **SepoliaETH** | Nativo (Fenrir no lo crea) | Lo que se aporta y lo que el contrato custodia | Sí |
| **FDT** | **ERC-20** (`ERC20Votes` + `ERC20Permit`) | Derecho económico proporcional + poder de voto; se quema al reclamar reparto/reembolso | **Sí** (mercado secundario) |
| **Certificado de Finalización** | **ERC-721** soulbound | Credencial de reputación al desarrollador al completar con éxito. **No** representa propiedad del inmueble | No |
| **Certificado de Proyecto Fallido** | **ERC-721** soulbound | Complemento negativo: se emite al desarrollador cada vez que un proyecto se cancela | No |
| **Insignia de participación por hito** | **ERC-1155** | Comprobante que se mintea a cada wallet que vota una propuesta; historial de participación del inversor/vecino | Sí — ERC-1155 estándar, **sin** restricción soulbound (a diferencia de los certificados) |

> Nota de diseño: la idea de tokenizar la **propiedad** del inmueble (fracciones tipo ERC-721/ERC-1155 = m²) se **descartó**. Un inmueble no es fraccionable legalmente en Argentina y un NFT no reemplaza la escritura notarial; por eso Inversión cierra **repartiendo dinero**, no fragmentos de propiedad.

---

## 5. On-chain vs. off-chain

Fenrir es **híbrido por diseño**. El criterio es fijo, no se decide hito por hito: **on-chain va lo que necesita confianza pública y verificable; off-chain va lo pesado o lo que no requiere esa garantía.**

### 5.1 Qué vive on-chain (Sepolia) y por qué

| En cadena | Por qué tiene que estar acá |
|---|---|
| **Custodia del ETH** (en `FenrirProject`) | Es el activo en juego. Si lo guardara un servidor, ese servidor sería el nuevo fiduciario. |
| **Emisión y quema de FDT** | El derecho económico y de voto debe ser verificable y transferible sin intermediario. |
| **Estado de los hitos y votación del DAO** | El núcleo de confianza: quién votó qué y si la etapa se aprobó tiene que ser público e inmanipulable. |
| **Elección de árbitro, reparto y reembolsos** | Son liquidaciones de dinero/poder: se ejecutan por código, no por decisión de una persona. |
| **Certificados de reputación (ERC-721)** | Deben vivir en la wallet del desarrollador, portables y comprobables entre proyectos. |
| **Por cada reporte de hito: `reportHash` (`bytes32`) + `reportUrl`** | Registro liviano que **ancla** el contenido off-chain. Con IPFS (driver de la demo), el `reportHash` es el **CID del reporte** (CIDv0 = multihash sha2-256, codificado en el `bytes32`): es a la vez **prueba de integridad y dirección** para recuperarlo desde IPFS. Si el contenido cambia, el CID cambia y la manipulación queda en evidencia. (Con el fallback de storage local, en cambio, es un SHA-256 plano del contenido.) |

### 5.2 Qué vive off-chain y por qué

| Fuera de cadena | Por qué no va en cadena |
|---|---|
| **Reportes de hito pesados**: texto extendido, fotos, videos, documentos (planos, boletos de compraventa) | Guardar blobs en cadena es **carísimo** (gas) y la blockchain no es un almacén de archivos. Van a **IPFS** (direccionado por contenido, pinneado vía **Pinata**, forzando **CIDv0**); se arma un manifest autocontenido y su **CID** se codifica en el `reportHash` on-chain (`cidV0ToBytes32`), así el reporte es verificable y recuperable desde la cadena aunque el backend se caiga. |
| **Espejo consultable del estado**: backend Express + TypeScript + PostgreSQL (vía Prisma) | Leer la cadena en cada render es lento y caro. Un **listener** (ethers.js) escucha los eventos de los contratos y mantiene una copia rápida y consultable. El frontend **nunca** lee on-chain directo. |
| **Verificación de identidad del desarrollador** (razón social, CUIT) | Es un dato personal y un trámite de validación; no aporta nada ponerlo en una cadena pública. Solo el resultado (wallet registrada) condiciona la creación on-chain. |
| **Índices, búsquedas y vistas del frontend** | Pura conveniencia de lectura; no necesita garantía de confianza. |

**El puente que lo hace seguro:** el backend **no recalcula ninguna regla de negocio** (no decide quién puede votar, ni cuánto se libera) —eso vive solo en los contratos—; se limita a **reflejar** el estado on-chain y a **servir** el reporte off-chain con su hash. El `reportHash` on-chain (el CID del reporte) es lo que ata las dos mitades: el contenido off-chain es verificable contra la cadena, sin tener que confiar en el servidor que lo sirve.

---

## 6. Casos borde contemplados

- **El desarrollador desaparece:** vencido el plazo de un hito, cualquier inversor llama `cancelStalledMilestone()` y se habilita el reembolso proporcional de las tranches **todavía no liberadas** (las ya liberadas son dinero volcado a la obra, no recuperable).
- **No se alcanza el quórum:** el período de votación se extiende automáticamente **una vez**; si persiste, interviene el árbitro. En el hito 0 (cuando todavía no hay árbitro) se resuelve eligiendo un inversor **al azar**.
- **Empate exacto:** lo desempata el árbitro con un voto que inclina el resultado.
- **Rechazo reiterado de un hito:** tras 2 reintentos (o si no se reintenta en 1 día), el proyecto se cancela y se reembolsa.
- **Un inversor quiere salir antes:** vende su FDT en un mercado secundario; quien lo compra hereda parte económica y voto.
- **Nunca se llega al FMPA:** el proyecto se cancela al vencer el TTL de fondeo y se reembolsa el **100%** de lo aportado.
- **Falta de fondos para el próximo hito:** la votación de un hito no se abre hasta tener asegurada la plata del siguiente; el proyecto queda pausado hasta que entre más inversión o los inversores lo cancelen.

---

## 7. Limitaciones reconocidas

- Corre sobre **Sepolia** (testnet, sin valor económico real).
- Un **NFT no reemplaza la escritura notarial** en Argentina; por eso Inversión cierra repartiendo dinero, no fracciones de propiedad.
- El **árbitro es un punto de centralización** asumido a propósito (resuelve empates y falta de quórum).
- El **azar** de la elección de árbitro (`blockhash` + `timestamp` + id de propuesta) sirve para la demo pero no resiste manipulación de validadores; con fondos reales habría que migrar a algo como **Chainlink VRF**.
- No hay **recuperación de wallet** perdida o comprometida: la custodia de la wallet es responsabilidad de cada usuario.
- **No hay apelación** de un rechazo malicioso de un hito bien ejecutado: decisión consciente, fuera de alcance.

---

## 8. Referencias bibliográficas

> Confirmar cuál de estas fue la fuente efectivamente vista en clase y dejarla como referencia principal; las demás quedan como apoyo.

1. **Nakamoto, S. (2008).** *Bitcoin: A Peer-to-Peer Electronic Cash System.* — Fundamento del problema que Fenrir ataca: cómo intercambiar valor **sin confiar en un tercero intermediario**. Es la justificación conceptual de reemplazar al fiduciario humano. https://bitcoin.org/bitcoin.pdf
2. **Buterin, V. (2014).** *Ethereum White Paper: A Next-Generation Smart Contract and Decentralized Application Platform.* — Plataforma de **smart contracts** sobre la que se construye Fenrir. https://ethereum.org/en/whitepaper/
3. **Estándares de token (Ethereum Improvement Proposals):** **EIP-20** (ERC-20, FDT), **EIP-721** (ERC-721, certificados de reputación) y **EIP-1155** (ERC-1155, insignias de participación). https://eips.ethereum.org/
4. **OpenZeppelin Contracts — Governance.** Documentación del patrón **Governor** y de las extensiones `ERC20Votes` / snapshots de voto, base del diseño de `FenrirGovernor` y `FenrirToken`. https://docs.openzeppelin.com/contracts/governance
