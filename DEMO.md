# Guion de demo — Fenrir (10–15 min)

> Guion para hablar. Cada sección tiene **lo que decís** + **qué mostrar en pantalla**.
> Tiempos aproximados arriba de cada bloque. Si vas corto de tiempo, recortá el bloque 5.

---

## 0. Apertura (30 s)

> "Fenrir reemplaza al **fiduciario humano** de un fideicomiso por **smart contracts + un DAO**.
> En vez de confiar en una persona que administre la plata de un proyecto, los inversores votan
> de forma **pública y verificable** si cada etapa se cumplió, y recién ahí se libera el dinero.
> Está desplegado y demostrado sobre **Sepolia** (testnet) — es un proyecto de seminario, no
> maneja dinero real."

---

## 1. El problema (1.5–2 min)

**Qué decir:**

- En un fideicomiso tradicional hay un **fiduciario**: una persona/entidad de confianza que
  custodia la plata de los inversores y la va liberando al desarrollador a medida que el proyecto
  avanza.
- Eso tiene tres problemas de fondo:
  1. **Confianza ciega.** El inversor no controla la plata; confía en que el fiduciario actúe bien.
  2. **Opacidad.** No hay forma simple de verificar, en tiempo real y de manera pública, si la
     etapa realmente se cumplió o si se liberaron fondos que no correspondían.
  3. **Costo y fricción.** Intermediario humano = honorarios, demoras, y un único punto de falla.
- En la práctica: el inversor pone la plata adelante y **queda a merced** de que un tercero
  decida si el desarrollador cumplió.

**Frase ancla:** *"¿Y si en lugar de confiar en una persona, la regla la hace cumplir el código,
y quién decide si se cumplió la etapa son los propios inversores votando?"*

---

## 2. La solución (2.5–3 min)

**Qué decir:**

- Fenrir parte la inversión en **hitos** (milestones). La plata **no** se entrega toda de una:
  queda **custodiada en el contrato** y se libera **tranche por tranche**, un tramo por hito.
- Cada hito tiene un ciclo: el desarrollador **declara** que lo cumplió → se abre una **votación
  del DAO** (los inversores) → si se **aprueba**, el contrato libera ese tramo; si se **rechaza**,
  hay reintentos y, en el peor caso, cancelación con reembolso.
- El que vota es **el que invirtió**, con peso proporcional a su inversión, mediante un token de
  gobernanza, el **FDT** (Fenrir Distribution Token), que se mintea al invertir.
- Hay dos tipos de proyecto sobre la **misma** infraestructura:
  - **Fenrir Inversión** — con fines de lucro: al final se vende y se reparte la ganancia
    proporcionalmente entre los inversores.
  - **Fenrir Cívico** — sin fines de lucro: obra pública, sin reparto.
- Hay un rol de **árbitro** electo por los propios inversores en el "Hito 0", que solo entra a
  desempatar casos borde (empates, falta de quórum) — no maneja la plata.

**Arquitectura híbrida (clave conceptual — mostrar el porqué):**

- **On-chain (Sepolia):** lo que necesita confianza pública y verificable → custodia de fondos,
  emisión de FDT, estado de los hitos, votación del DAO, reparto final.
- **Off-chain (backend + PostgreSQL):** lo caro o pesado de poner en cadena → fotos/videos de
  avance, texto largo del reporte, documentos, identidad del desarrollador.
- Por cada hito declarado, **on-chain solo va un registro liviano**: ID del hito, wallet que
  declara, timestamp, una **URL** al reporte completo y un **hash SHA-256** de ese reporte. El
  backend sirve el reporte en esa URL y su contenido **siempre tiene que coincidir** con el hash
  on-chain. Así lo pesado vive off-chain pero queda **anclado y verificable** contra la cadena.

**Los 4 contratos** (mostrar `contracts/src/`):

| Contrato | Responsabilidad |
|---|---|
| `FenrirFactory` | Punto de entrada. Crea proyectos y despliega las instancias enlazadas de los otros 3 |
| `FenrirProject` | Custodia los fondos por hito, libera tranches, trackea estado, maneja venta y reclamos |
| `FenrirToken` | El FDT. Mintea al invertir, snapshot para votar, burn al reclamar |
| `FenrirGovernor` | Motor de gobernanza (patrón OpenZeppelin Governor): propuestas, votos, quórum, desempates |

---

## 3. Hardhat y el deploy desde acá (3–4 min)

> **Nota para vos (no decir):** la `constitution.md` Principio IV todavía dice "deploy manual por
> Remix". Eso quedó viejo: el repo **ya tiene un pipeline propio de Hardhat**. Presentá Hardhat;
> si alguien cita Remix, aclarás que se migró a un flujo local con Hardhat.

**Qué decir:**

- Los `.sol` viven en `contracts/src/` y son la **fuente de verdad** del comportamiento on-chain.
- Usamos **Hardhat** para **compilar** y un script propio en **ethers v6** para **deployar** a
  Sepolia.

### 3a. Compilación — mostrar `contracts/hardhat.config.ts`

> "La config de Hardhat es mínima a propósito:"

- Solidity **0.8.24**, con **optimizer** (200 runs) y **viaIR** activado.
- `sources: "./src"` → compila desde nuestra carpeta `src`, no la default.
- `hardhat compile` deja los **artifacts** (ABI + bytecode de cada contrato) en
  `contracts/artifacts/src/`. Esos artifacts son lo que consume el deploy.

### 3b. Deploy — mostrar `contracts/scripts/deploy.mjs`

> "El deploy tiene una particularidad interesante por cómo está armado el Factory."

El `FenrirFactory` depende de **3 libraries `external`** —`TokenDeployer`, `GovernorDeployer`,
`ProjectDeployer`— que son las que efectivamente despliegan cada contrato hijo. Eso obliga a un
flujo en dos pasos:

1. **Deployar las 3 libraries primero** y guardarse sus direcciones.
2. **Linkear** esas direcciones dentro del **bytecode de creación** del Factory antes de enviarlo.
   El script hace el linking **a mano**: lee las `linkReferences` del artifact (que dicen en qué
   posición exacta del bytecode va cada library) y reemplaza los placeholders por las direcciones
   reales — eso es la función `linkBytecode`.
3. Recién entonces **deploya el Factory** ya linkeado, firmando con la wallet de `PRIVATE_KEY`.

> Punto a destacar: **no usamos el runtime de Hardhat para deployar.** Hardhat solo compila;
> el deploy es ethers puro leyendo los artifacts. Eso nos da control total sobre el linking de
> libraries, que es justo lo que el flujo "mágico" de Hardhat nos escondería.

**Cómo se corre (mostrar el header del script):**

```bash
# 1) compilar (deja artifacts/)
hardhat compile
# 2) completar contracts/.env con SEPOLIA_RPC_URL y PRIVATE_KEY (con SepoliaETH de un faucet)
# 3) deployar
node scripts/deploy.mjs
```

**Qué imprime al final** (y para qué sirve):

```
FENRIR_FACTORY_ADDRESS=0x....     -> va al server/.env
INGESTION_START_BLOCK=NNNNNN      -> va al server/.env
```

> "La dirección del Factory y el bloque donde se deployó son **el puente al backend**: el backend
> arranca a escuchar eventos **desde ese bloque** y conociendo **esa** dirección. Con eso enlazamos
> el deploy on-chain con todo el off-chain."

---

## 4. Las ABIs: backend, frontend, y por qué el front también la necesita (3–4 min)

> Este es el bloque que pidieron explicar bien. La idea central: **una sola ABI compartida**, y
> **dos consumidores con propósitos distintos**.

### 4a. Qué es la ABI (1 frase)

> "La ABI es el **contrato de interfaz** entre el mundo JS y el contrato en la cadena: dice qué
> funciones y qué eventos tiene, con qué tipos. Sin ABI, ethers no sabe **cómo codificar** una
> llamada ni **cómo decodificar** un evento."

### 4b. Una sola fuente de verdad — mostrar `shared/chain/abis.ts`

- Las ABIs de los 4 contratos están escritas **una sola vez** en
  [`shared/chain/abis.ts`](shared/chain/abis.ts), en formato **human-readable** de ethers v6
  (las firmas como strings: `"event Invested(address indexed investor, uint256 amount)"`, etc.).
- Tanto `client/` como `server/` **importan de ahí** (`@shared/chain/abis`). Nadie redefine la ABI
  de su lado. Esto sigue el principio de **única fuente de verdad** de la constitution: si cambia
  una firma, se toca **un solo archivo** y ambos lados quedan sincronizados.

### 4c. Cómo la usa el BACKEND — mostrar `server/src/models/onchain/abis/index.ts` + `listener.ts`

- El backend reexpone las ABIs como un objeto `ABIS` y las usa para dos cosas:
  1. **Escuchar eventos** ([`listener.ts`](server/src/ingestion/listener.ts)): arma un
     `Interface` con cada ABI, hace **polling** de los logs de la cadena, los **parsea** y los
     **espeja en PostgreSQL** vía Prisma. Así el frontend consulta un estado rápido y queryable
     sin pegarle a la cadena en cada render.
  2. **Lecturas `view`** ([`provider.ts`](server/src/models/onchain/provider.ts)): el backend
     también puede leer estado on-chain directo cuando lo necesita.
- O sea: el backend usa sobre todo los **`event`** y los **`view`** de la ABI.

### 4d. Cómo la usa el FRONTEND — mostrar `client/src/lib/chain/contracts.ts`

- El frontend usa la ABI para **dos** cosas:
  1. **Escrituras firmadas por el usuario** (la parte importante): `invest()`, `castVote()`,
     `declareMilestone()`, `submitOffer()`, `claimDistribution()`… Arma un `ethers.Contract` con
     el **signer del usuario** (su wallet, ej. MetaMask) y manda la transacción.
  2. **Lecturas directas críticas**: para estado que **no puede esperar** al espejo del backend
     (que puede ir atrasado) — ej. si la wallet está registrada como developer en el Factory
     actual, o si tiene un reembolso para reclamar. Usa el `provider`, no el signer.

### 4e. ¿Por qué el frontend TIENE que conocer la ABI también? (el remate)

> Esta es la pregunta del enunciado. Respuesta en tres puntos:

1. **Las escrituras las firma el usuario, no el backend.** En Fenrir el inversor invierte, vota y
   reclama **con su propia wallet**. Esa transacción se firma **en el navegador** y va **directo
   al contrato**. Para construir y firmar esa tx, ethers necesita la ABI **en el frontend** — el
   backend nunca toca las claves del usuario, así que **no puede** firmar por él.
   *(El backend solo tiene un signer propio para escrituras automáticas mínimas, como cerrar una
   propuesta vencida — `resolve()` — y nada que mueva la plata de un usuario.)*

2. **No custodiar claves es una decisión de diseño, no una limitación.** Si el front mandara la
   acción al backend para que firme, el backend volvería a ser el "fiduciario" que justamente
   queremos eliminar. Que el usuario firme su propia tx contra el contrato es lo que mantiene el
   sistema **trustless**.

3. **Lectura sin punto ciego.** El espejo en Postgres es rápido pero **eventual** (va por polling
   con confirmaciones). Para decisiones sensibles, el front lee la **verdad on-chain directa** —y
   para eso, otra vez, necesita la ABI.

**Cierre del bloque:**

> "Resumen: **una sola ABI en `shared/`**, importada por los dos lados. El **backend** la usa para
> **escuchar eventos y espejar estado**; el **frontend** la usa para que el **usuario firme sus
> propias transacciones** contra el contrato y para **leer la cadena directo** cuando no puede
> confiar en el espejo. Ambos la necesitan porque cada uno **habla con la cadena por su cuenta**,
> con propósitos distintos."

---

## 5. (Opcional, si sobra tiempo) Demo en vivo (2–3 min)

Flujo corto sugerido:

1. Mostrar un proyecto creado (Factory ya deployado en Sepolia).
2. **Invertir** con MetaMask → se mintea FDT (escritura firmada por el usuario, front + ABI).
3. El desarrollador **declara un hito** → ver el evento aparecer en el backend (listener + ABI).
4. **Votar** el hito con otra wallet → al aprobarse, el contrato **libera el tranche**.
5. Señalar el reporte off-chain y su **hash** anclado on-chain.

---

## Anti-cheat sheet (preguntas probables)

- **"¿Por qué no Remix?"** → Empezamos pensando en Remix manual, pero migramos a un pipeline local
  con Hardhat (compile) + script ethers (deploy) para tener control del linking de libraries y un
  deploy reproducible.
- **"¿Por qué linkear libraries a mano?"** → El Factory usa 3 libraries `external` para deployar los
  hijos; sus direcciones se conocen recién en runtime y hay que inyectarlas en el bytecode del
  Factory antes de enviarlo (`linkReferences` → `linkBytecode`).
- **"¿Por qué no leer siempre on-chain desde el front?"** → Sería lento y caro en cada render; por
  eso el backend espeja el estado en Postgres. El front lee directo solo lo crítico/fresco.
- **"¿Dónde está la lógica de negocio?"** → En los contratos y el backend, nunca en el front. El
  front es 'tonto': renderiza lo que la API devuelve y firma lo que el usuario decide.
- **"¿Qué pasa si cambia una firma del contrato?"** → Se actualiza **solo** `shared/chain/abis.ts`
  y los dos lados quedan sincronizados.
```
