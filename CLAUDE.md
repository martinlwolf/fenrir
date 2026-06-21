# CLAUDE.md

Este documento le da contexto a Claude (o a cualquier asistente que trabaje sobre este repositorio) sobre qué es Fenrir, cómo está armado el proyecto a nivel técnico y dónde encontrar el resto de la documentación. El objetivo es no tener que re-explicar el sistema en cada sesión de trabajo.

Este documento contiene el **core del proyecto** (qué es, stack, estructura, cómo correrlo, despliegue, convenciones de código). Las **reglas de negocio** (roles, tipos de proyecto, tokens, ciclo de hitos, fondeo, comisión, casos borde, glosario) viven en [`business_rules/`](business_rules/index.md), no acá.

---

## 1. Qué es Fenrir

Fenrir reemplaza al fiduciario humano de un fideicomiso tradicional por smart contracts y un DAO. En vez de que un banco o una fiduciaria administre los fondos y decida cuándo liberarlos, son los propios inversores quienes votan, de forma pública y verificable, si cada etapa de un proyecto se cumplió.

Una sola fábrica de contratos (`FenrirFactory`) permite crear, sobre la misma infraestructura, dos tipos de proyecto:

- **Fenrir Inversión** — con fines de lucro. Se vende el inmueble al final y se reparte la ganancia proporcionalmente entre los inversores.
- **Fenrir Cívico** — sin fines de lucro. Obra pública o vecinal (plaza, escuela, agua, etc.), financiada colectivamente, sin retorno económico.

El sistema se desarrolla y se demuestra sobre **Sepolia**, la red de pruebas de Ethereum. Es un proyecto de seminario universitario de introducción a blockchain; no maneja dinero real.

Ver [`business_rules/tipos-de-proyecto.md`](business_rules/tipos-de-proyecto.md) para el detalle de cada tipo.

---

## 2. Stack tecnológico

| Capa | Tecnología | Deploy |
|---|---|---|
| Frontend | React + TypeScript (`.tsx`), Tailwind CSS, componentes de **shadcn/ui**, Axios para consumir la API | **Vercel** |
| Backend | Express + TypeScript | **Render** |
| Base de datos | PostgreSQL (hoy) accedido vía **Prisma** como ORM. Migración planeada a **Supabase** a futuro | — |
| Contenedores | Dockerfile por servicio (`frontend`, `backend`) + `docker-compose.yml` para levantar todo el entorno local con un solo comando | — |
| Smart contracts | Solidity (`.sol`), en una carpeta separada del resto del código | **Remix IDE** (deploy manual, no automatizado desde este repo) |

**Nota sobre Supabase:** como la migración está planeada pero no es inmediata, conviene evitar atarse a features muy específicas de Postgres puro en las queries del backend, y mantener el acceso a datos en una capa propia a través de **Prisma** (no esparcir SQL crudo por todos lados) para que el día de mañana cambiar el proveedor sea un cambio acotado.

**Nota sobre `/contracts`:** los archivos `.sol` de esta carpeta no se compilan ni se despliegan desde este repo con Hardhat ni Foundry. Se escriben acá como fuente de verdad y se copian manualmente a Remix para compilar y desplegar en Sepolia. Si en algún momento se agrega un pipeline de compilación local, hay que documentarlo en esta sección.

---

## 3. Estructura del repositorio

```
fenrir/
├── frontend/               # React + TSX + Tailwind + shadcn/ui
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── backend/                 # Express + TypeScript
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── contracts/                # .sol — fuente de verdad, se exportan a Remix
│   ├── FenrirFactory.sol
│   ├── FenrirProject.sol
│   ├── FenrirToken.sol
│   └── FenrirGovernor.sol
├── business_rules/          # reglas de negocio (ver sección 9)
│   ├── index.md
│   ├── roles.md
│   ├── tipos-de-proyecto.md
│   ├── tokens.md
│   ├── ciclo-de-hitos.md
│   ├── venta-y-reparto.md
│   ├── fondeo-y-comision.md
│   ├── casos-borde.md
│   ├── decisiones-pendientes.md
│   └── glosario.md
├── docker-compose.yml
├── CLAUDE.md
└── README.md
```

---

## 4. Cómo correr el proyecto localmente

```bash
docker compose up --build
```

Esto debería levantar `frontend`, `backend` y `postgres` en una sola red local. Variables de entorno mínimas esperadas (ver `.env.example` en cada app cuando exista):

- Backend: `DATABASE_URL` (pooled, para la app), `DIRECT_URL` (directa, para migraciones de Prisma — hoy vale lo mismo que `DATABASE_URL`, se separan recién al migrar a Supabase), `PORT`, `SEPOLIA_RPC_URL`, direcciones de los contratos desplegados (`FENRIR_FACTORY_ADDRESS`, etc.)
- Frontend: `VITE_API_URL` (o equivalente) apuntando al backend, `VITE_SEPOLIA_CHAIN_ID`

---

## 5. Despliegue

- **Frontend → Vercel**, conectado a la carpeta `/client`.
- **Backend → Render**, conectado a la carpeta `/server`, corriendo el `Dockerfile` del servicio.
- La base de datos en producción corre aparte (Render Postgres o similar hoy; Supabase a futuro). El backend nunca debe asumir que la base vive en el mismo host que el contenedor.

---

## 6. Arquitectura general (on-chain vs off-chain)

El sistema es híbrido a propósito:

- **On-chain (smart contracts en Sepolia):** custodia de fondos, emisión de FDT, hitos y su estado, votaciones del DAO, reparto final. El detalle de cada mecánica vive en [`business_rules/`](business_rules/index.md).
- **Off-chain (backend + Postgres):** todo lo que es pesado o caro de subir a blockchain — fotos y videos de avance de obra, descripciones extendidas de cada reporte, documentos (boletos de compraventa, planos, etc.), y la verificación de identidad del desarrollador.

Para cada hito declarado, lo que se guarda **on-chain** es liviano: el ID del hito, la wallet que declara, el timestamp del bloque, una URL al reporte completo en la aplicación, y un hash SHA-256 del contenido de ese reporte. El backend es responsable de servir ese reporte completo en la URL referenciada y de que su contenido coincida siempre con el hash registrado on-chain.

El backend también debe escuchar los eventos que emiten los contratos (vía un listener con ethers.js o similar) para mantener una copia rápida y consultable del estado on-chain en Postgres, en vez de que el frontend tenga que leer todo directo de la blockchain en cada render.

---

## 7. Smart contracts (carpeta `/contracts`)

| Contrato | Responsabilidad |
|---|---|
| `FenrirFactory.sol` | Punto de entrada. Crea proyectos nuevos con todos sus parámetros y despliega las instancias vinculadas de los otros tres contratos |
| `FenrirProject.sol` | Custodia los fondos en tranches por hito, libera presupuesto al desarrollador, mantiene el estado de cada hito, gestiona depósitos de venta y reclamos finales |
| `FenrirToken.sol` | El FDT. Mintea al invertir, soporta snapshot para votación, quema al reclamar (en Inversión) |
| `FenrirGovernor.sol` | Motor de gobernanza (basado en el patrón Governor de OpenZeppelin). Crea propuestas, cuenta votos, valida quórum y umbral, resuelve empates y falta de quórum, ejecuta la acción aprobada |

El detalle de qué dispara cada cosa y bajo qué condiciones vive en [`business_rules/`](business_rules/index.md), sobre todo [`ciclo-de-hitos.md`](business_rules/ciclo-de-hitos.md) y [`fondeo-y-comision.md`](business_rules/fondeo-y-comision.md).

---

## 8. Convenciones de código

A completar a medida que el código exista. Por ahora:

- TypeScript en todo el proyecto (frontend y backend), sin `any` salvo justificación.
- Acceso a la base de datos del backend siempre vía **Prisma** (ORM); no usar SQL crudo ni otro ORM en paralelo.
- UI solo a través de componentes de **shadcn/ui**; no crear primitivos desde cero salvo que shadcn no cubra el caso.
- Un único cliente Axios centralizado en el frontend (ej. `src/lib/api.ts`), no instanciar Axios suelto en cada componente.
- Variables de entorno siempre vía `.env`, nunca hardcodeadas. Mantener un `.env.example` actualizado por servicio.
- Nombres de contratos, eventos y funciones en `PascalCase` / `camelCase` siguiendo la convención ya usada en este documento (`FenrirFactory`, `declareComplete`, etc.) para que el código coincida con el vocabulario de diseño.

---

## 9. Reglas de negocio

Las reglas de negocio de Fenrir (roles, tipos de proyecto, tokens, ciclo de vida de los hitos, fondeo, comisión, casos borde, decisiones pendientes, glosario) viven en [`business_rules/index.md`](business_rules/index.md), no en este documento. Las decisiones nuevas se discuten y se escriben directamente en el archivo correspondiente dentro de `business_rules/`.
