---
name: frontend-developer
description: Punto de entrada para trabajo de frontend en Fenrir (React + TypeScript + Tailwind + shadcn/ui). Funciona como registry de los skills de patrones de frontend disponibles -- `vercel-composition-patterns` para composición de componentes (boolean props, compound components, context providers, render props, React 19), `shadcn` para agregar/buscar/componer componentes de shadcn/ui, y `typescript-advanced-types` para generics, conditional types y mapped types al generar interfaces o tipos -- y define los overrides propios de este proyecto, que tienen prioridad sobre la guía genérica de esos skills cuando entran en conflicto: regla de 2 para abstraer componentes repetidos, prioridad de shadcn/ui sobre elementos nativos, una única instancia de Axios centralizada, toda llamada a la API abstraída en funciones dentro de `services/`, y reusar (nunca duplicar) los Zod schemas/constantes/tipos de `shared/`. Usar para cualquier tarea de frontend en `client/`: crear o refactorizar componentes, decidir si abstraer JSX repetido, elegir entre shadcn/ui y un elemento nativo, generar tipos/interfaces, consumir la API desde el frontend, o revisar código de frontend.
---

# Frontend Developer (Fenrir)

Punto de entrada para trabajo de frontend en este proyecto. No reemplaza a los skills
de patrones que registra — los referencia para el detalle técnico, y agrega encima
las reglas propias de Fenrir, que tienen prioridad cuando hay conflicto.

## Registry de skills de frontend

| Skill | Para qué sirve |
|---|---|
| [`vercel-composition-patterns`](../vercel-composition-patterns/SKILL.md) | Patrones de composición de React que escalan: evitar proliferación de boolean props, compound components, lifting state, context providers, render props vs. children, APIs de React 19 |
| [`shadcn`](../shadcn/SKILL.md) | Agregar, buscar, debuggear y componer componentes de shadcn/ui vía su CLI; docs y ejemplos de cada componente |
| [`typescript-advanced-types`](../typescript-advanced-types/SKILL.md) | Generics, conditional types, mapped types, template literals y utility types — invocarlo al generar interfaces, props tipadas o cualquier tipo no trivial |

Para cualquier duda de composición de componentes que no esté cubierta por los
overrides de abajo, invocar `vercel-composition-patterns` directamente. Para agregar o
elegir un componente de UI concreto, invocar `shadcn` (siempre antes de escribir un
elemento nativo, ver override de abajo). Para tipos no triviales al definir props,
DTOs o respuestas de la API, invocar `typescript-advanced-types`.

## Overrides de Fenrir (prioridad sobre los skills registrados)

### Regla de 2, no de 3

La "rule of three" clásica de `vercel-composition-patterns` (esperar la tercera
repetición para abstraer) **no aplica en Fenrir**. Acá la abstracción se hace en la
segunda repetición: en cuanto un mismo bloque de JSX o de lógica de presentación
aparece dos veces, se extrae a su propio componente reutilizable. No esperar una
tercera ocurrencia para justificar el refactor.

- ❌ Dos bloques de JSX casi idénticos inline en dos pantallas distintas, dejados así
  "por si después cambia y no vale la pena abstraer todavía".
- ✅ Apenas aparece la segunda repetición, se extrae a su propio componente (ej.
  `components/ProjectCard.tsx`) y ambos call sites lo usan.

### shadcn/ui antes que nativo

Para cualquier elemento de UI, el orden de preferencia es:

1. **Componente de shadcn/ui** que cubra el caso (`Button`, `Input`, `Select`,
   `Dialog`, etc. — ver `.specify/memory/constitution.md`, Principio III).
2. Solo si shadcn no cubre la funcionalidad o el estilo necesario, crear un **wrapper
   component** propio (ej. `components/ui-custom/AddressInput.tsx`) que encapsule el
   elemento nativo o la librería externa puntual.

No usar un elemento nativo "a mano" (`<input>`, `<select>`, `<button>`, etc.) como
atajo cuando existe el equivalente en shadcn, ni siquiera para un caso puntual. Si
hace falta algo que shadcn no ofrece, el wrapper component es el lugar para ese caso
especial — no esparcir el elemento nativo crudo por las pantallas.

### Axios: una única instancia centralizada

Una sola instancia de Axios, creada en un único lugar (ej. `src/lib/api.ts`) y
reutilizada en todo el frontend (ver `.specify/memory/constitution.md`, Principio III). No instanciar `axios.create()`
suelto en componentes, hooks, ni en cada archivo de `services/`.

Si un caso puntual parece necesitar otra configuración (otra `baseURL`, headers
distintos, otro timeout), primero intentar resolverlo pasando esa config por request
a la instancia única (`api.get(url, { headers, timeout })`) en vez de crear una
instancia nueva. Si después de eso de verdad hace falta una segunda instancia, está
permitido — pero hay que **avisar explícitamente** (decirle a quien pidió el cambio
que se está rompiendo la regla de instancia única y por qué), nunca crear una segunda
instancia en silencio.

### Llamadas a la API: siempre abstraídas en `services/`

Ningún componente, hook ni página llama a `api.get/post/put/delete` directamente.
Cada llamada a la API vive en una función dentro de `src/services/` (ej.
`services/projects.service.ts` con `getProject(id)`, `services/milestones.service.ts`
con `declareMilestone(...)`), y los componentes consumen esas funciones — nunca el
cliente Axios.

Es la misma idea de capas que ya separa controllers de DAOs en el backend (ver skill
`backend-architecture`): el componente no sabe que la llamada es HTTP, solo invoca una
función con nombre de dominio.

### Tipos, schemas y constantes compartidas: consumir `shared/`, no redefinir

Si el mismo Zod schema, constante (enums de estado, límites) o tipo ya existe en
`shared/` porque el backend también lo usa, importarlo desde ahí — nunca declarar una
copia local en `client/` "por las dudas" o porque es más rápido que importar. Esto
incluye la validación de formato que el frontend tiene permitido hacer (ver
constitution Principio II): se hace con el schema de `shared/`, no con uno nuevo. Si
hace falta un tipo o constante que el backend no expone todavía, es trabajo del
agente `developer` agregarlo a `shared/`, no del agente `frontend` duplicarlo
localmente.

## Cómo usar este skill

1. Aplicar primero los overrides de arriba.
2. Para el resto de las decisiones de composición (cuándo usar compound components,
   cómo manejar estado compartido entre componentes hermanos, props booleanos, etc.),
   consultar `vercel-composition-patterns`.
3. Para trabajar con componentes de UI concretos (agregar, buscar, debuggear), invocar
   `shadcn`.
4. Para tipos no triviales (generics, conditional types, mapped types) al generar
   interfaces o tipos de props/DTOs, invocar `typescript-advanced-types`.
5. Si en el futuro se agregan más skills de frontend (Tailwind, formularios, data
   fetching, etc.), registrarlos en la tabla de arriba en vez de duplicar contenido
   acá.
