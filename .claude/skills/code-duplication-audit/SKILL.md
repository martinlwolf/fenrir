---
name: code-duplication-audit
description: Audita duplicacion de codigo entre client/, server/ y shared/ en Fenrir y produce un reporte. Detecta (1) constantes, enums, vars, types, interfaces o Zod schemas declarados en mas de una raiz (la misma definicion repetida en server/ y shared/, etc.), que viola la regla de la constitution de "definir una sola vez en shared/ e importar"; y (2) simbolos exportados desde shared/ que en realidad se usan en una sola raiz (p.ej. solo server/), candidatos a sacarse de shared/ y mover a esa raiz. Usar antes de un PR, al revisar shared/, cuando se sospeche codigo duplicado entre las tres areas, o cuando se pida auditar/limpiar la duplicacion. Incluye un script de escaneo (scripts/scan-duplicates.mjs) y los criterios de juicio para interpretarlo, incluidas las excepciones por dependencia/herencia interna de shared/.
---

# Auditoria de duplicacion de codigo (client / server / shared)

Fenrir se reparte en cuatro paquetes self-contained (`shared/`, `server/`, `client/`,
`contracts/`). La regla de la **constitution** (lineas 75-77) es tajante: los contratos
compartidos — Zod schemas, constantes y tipos que usan client/ **y** server/ — se
definen **una sola vez en `shared/`** y se importan vïa el alias `@shared/*`; **ninguna
raiz los redefine ni los duplica localmente**. `shared/` solo carga shape/format, nunca
logica de negocio (Principios II/III).

Esta skill audita el cumplimiento de esa regla y produce un reporte con dos fichas que
deben "saltar":

1. **Duplicacion cross-area** — el mismo identificador definido en 2+ raices.
2. **Falso `shared/`** — algo exportado desde `shared/` que en realidad consume una sola
   raiz, y que por lo tanto deberia salir de `shared/` y bajar a esa raiz.

Es un rol de **analisis y reporte**, no de edicion: la skill detecta y recomienda; quien
corrija (mover el codigo, dedupe) decide con el reporte en mano.

## Como correr el escaneo

```bash
node .claude/skills/code-duplication-audit/scripts/scan-duplicates.mjs
```

Desde la raiz del repo. Imprime un reporte markdown con tres secciones. Acepta `--json`
para salida estructurada, y un primer argumento opcional con la raiz del repo si no se
corre desde ahi.

El script es una **heuristica** (regex sobre declaraciones top-level de `.ts/.tsx`, no un
parser): es el punto de partida, no el veredicto. Todo hallazgo se confirma leyendo el
codigo, y la seccion 🟡 **siempre** pide juicio humano (ver mas abajo).

## Como leer el reporte

### 🔴 Duplicacion cross-area — casi siempre un hallazgo real

El mismo identificador (`const`, `enum`, `type`, `interface`, `Zod schema`, var)
declarado en 2+ raices. Esto es lo que el usuario llama "que salte la ficha de la
duplicacion". El caso testigo de hoy: los arrays de enums (`PROJECT_TYPE`,
`MILESTONE_STATUS`, `PROPOSAL_STATUS`, ...) estan en `shared/constants/enums.ts` **y**
re-declarados en `server/src/models/onchain/enums.ts`.

Para cada hallazgo, verificar y reportar:

- **Misma definicion** (mismos valores/forma): es duplicacion pura → el server debe
  **importar** de `@shared/...` y borrar su copia. Reportarlo en rojo.
- **Misma forma pero distinto proposito** (p.ej. shared declara el `as const` para el
  tipo, y server arma un `Value[]` ordenado para mapear el `uint8` on-chain): sigue
  siendo duplicacion del *dato*. La fuente de verdad es `shared/`; el server debe
  **derivar** su estructura de la constante compartida (`[...MILESTONE_STATUS]`) en vez
  de re-tipear los valores a mano, para que no puedan divergir.
- **Colision de nombre casual** (dos cosas distintas que se llaman igual): no es
  duplicacion. Anotarlo como descartado para que no vuelva a saltar.

### 🟡 En `shared/` pero usado en una sola raiz — pide juicio

Exportados desde `shared/` que solo referencia client/ **o** server/, no ambos. La idea
del usuario: si algo vive en `shared/` pero solo lo usa server/, **sacarlo de `shared/`
y ponerlo en `server/`** (y al reves con client/). Pero antes de recomendar el movimiento
hay que pasar por estos filtros:

1. **`client/` esta vacio hoy.** Mientras no exista frontend, *casi todo* `shared/`
   aparecera como "usado solo en server/". Eso **no** significa que haya que vaciar
   `shared/`. Un schema/tipo de **request/response de la API** existe precisamente para
   que el futuro `client/` lo reuse: es un contrato compartido por diseño, aunque hoy
   solo lo toque el server. **No** recomendar moverlo. Distinguir:
   - *Contrato de API* (request/response schemas, DTOs, enums de estado que el front va a
     renderizar) → se queda en `shared/` aunque hoy solo lo use server.
   - *Detalle interno del server* que se colo en `shared/` sin razon de contrato (algo
     que el front nunca veria) → ese si es candidato real a bajar a `server/`.
2. **Excepcion por dependencia/herencia (la marca `intra-shared`).** Si el simbolo es
   usado por otros simbolos dentro de `shared/` (un schema base del que extienden otros,
   una constante que componen varios schemas, un tipo del que heredan otros), conviene
   **mantenerlo en `shared/`** aunque su consumidor externo sea uno solo: separarlo
   fragmenta el modulo y obliga a importar cruzado entre raices. El usuario pidio
   explicitamente respetar estos casos para "no volverse locos al buscar codigo". El
   script marca estos simbolos con ⚠️ `intra-shared`.

Recomendar el movimiento **solo** cuando el simbolo pasa los dos filtros: no es contrato
de API y no tiene dependencias intra-shared. En el reporte, para cada candidato real,
indicar el path destino sugerido (p.ej. `server/src/...`).

### ⚪ En `shared/` sin uso en client/ ni server/

Exportados que no se referencian fuera de `shared/`. Puede ser: (a) codigo muerto a
borrar, (b) un contrato declarado a futuro todavia no consumido, o (c) un falso negativo
del escaneo textual (se usa via re-export, `z.infer`, o un nombre construido
dinamicamente). **Verificar a mano** antes de proponer borrar nada — sobre todo con
`client/` vacio, donde muchos contratos legitimos todavia no tienen consumidor.

## Formato del reporte final

Despues de correr el script y aplicar el juicio, entregar un reporte con:

1. **Resumen** — cuantos hallazgos 🔴 reales, cuantos 🟡 candidatos a mover (tras filtros),
   cuantos ⚪ a revisar.
2. **🔴 Duplicacion a deduplicar** — por cada uno: identificador, las ubicaciones
   (`archivo:linea`), cual es la fuente de verdad (`shared/`) y que raiz debe importar en
   vez de redeclarar.
3. **🟡 Sacar de `shared/`** — solo los que pasaron los filtros: identificador, ubicacion
   actual, raiz consumidora unica, path destino sugerido.
4. **⚠️ Se quedan en `shared/` (con justificacion)** — los candidatos del script que se
   descartan por ser contrato de API o por dependencia/herencia intra-shared. Listarlos
   para dejar constancia de que se evaluaron y por que se mantienen.
5. **⚪ A verificar** — posibles muertos, con la advertencia de `client/` vacio.

No editar codigo en esta skill: el reporte es el entregable. La correccion la hace el
agente `developer` (con `backend-architecture`) o quien corresponda.
