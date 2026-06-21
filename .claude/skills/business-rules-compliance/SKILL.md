---
name: business-rules-compliance
description: Audita si el código de contracts/, backend/ y frontend/ implementa correctamente las decisiones de negocio de Fenrir documentadas en business_rules/ (fondeo, custodia y liberación de tranches, hito 0 y elección/pérdida del rol de árbitro, ciclo de vida de hitos, hito final de venta, comisión y penalización, casos borde, identidad del developer, tokens FDT/ERC-721/ERC-1155, rol de comprador). Usar después de escribir o modificar smart contracts o lógica de negocio relacionada, antes de un PR, o cuando se pida explícitamente revisar/auditar/validar que el código cumple las decisiones de negocio. Siempre releer business_rules/ completo al momento de auditar -- no asumir su contenido de memoria.
---

# Auditoría de decisiones de negocio (Fenrir)

## Por qué existe

[`business_rules/`](../../../business_rules/index.md) es la fuente de verdad de las
reglas de negocio de Fenrir — no el código. Este skill compara el código generado
(contratos, backend, frontend) contra esos documentos y reporta divergencias. No es
una revisión de estilo ni de arquitectura — para eso están los skills
`backend-architecture` y `frontend-developer`. Esto es específicamente sobre si el
*comportamiento* implementado coincide con lo que el equipo decidió.

`CLAUDE.md` (raíz) solo tiene el core técnico del proyecto (stack, estructura, cómo
correrlo) — no contiene reglas de negocio y no hace falta auditarlo contra el código.

## Paso 0 — Releer las fuentes, siempre

Releer todo lo siguiente en cada auditoría, sin asumir que una lectura previa en la
conversación sigue vigente:

- [`business_rules/index.md`](../../../business_rules/index.md) — funciona como
  registry: lista cada archivo de reglas y qué cubre.
- **Todos** los archivos que liste ese índice, no solo los que parezcan relevantes a
  primera vista (hoy son: `roles.md`, `tipos-de-proyecto.md`, `tokens.md`,
  `ciclo-de-hitos.md`, `venta-y-reparto.md`, `fondeo-y-comision.md`, `casos-borde.md`,
  `decisiones-pendientes.md`, `glosario.md` — pero la lista puede crecer; confiar en lo
  que diga `index.md` en el momento de la auditoría, no en esta lista fija).

## Paso 1 — Armar la lista de afirmaciones verificables

A partir de la lectura actual de los documentos, extraer afirmaciones concretas y
falsables (no objetivos vagos). No usar una lista fija ni memorizada: los documentos
cambian de sesión a sesión, así que la lista se rearma cada vez. A modo de referencia,
este es el nivel de granularidad esperado:

- "El hito 0 (elección de árbitro) se dispara automáticamente al alcanzar el FMPA
  (Fondo Mínimo Para Arrancar); no lo declara el developer."
- "El developer no puede ser candidato a árbitro de su propio proyecto."
- "Sin quórum en el hito 0 se elige un inversor al azar — no interviene árbitro,
  todavía no existe ninguno electo."
- "La tranche del primer hito de obra se libera automáticamente al resolverse el
  hito 0, sin voto."
- "El resto de las tranches se libera al *aprobarse* el hito, no al *declararlo*, y
  solo si ya se recaudó el monto necesario para cubrirla."
- "Rechazar un hito no libera fondos y descuenta un % fijo y acumulativo de la
  comisión final, que nunca es negativa."
- "Cada hito admite hasta 2 reintentos (3 votaciones en total), contados de forma
  independiente por hito; al tercer rechazo de ese hito se cancela el proyecto."
- "El precio mínimo de venta es informativo: el contrato ya no rechaza ofertas por
  debajo de ese valor antes de la votación."
- "En la votación del hito de venta vota también el developer (con el mismo peso que
  1 FDT), no solo los inversores con FDT."
- "Al cancelar el proyecto solo son reembolsables las tranches de hitos cuyo voto
  nunca se aprobó; lo ya liberado no se recupera."
- "Si el árbitro vende todo su FDT, pierde el rol y se repite la elección."
- "El árbitro también desempata un resultado parejo con quórum alcanzado, no solo la
  falta de quórum."
- "El developer debe registrar razón social + CUIT (verificación off-chain) antes de
  poder crear un proyecto, y esa wallet queda como la única válida para ese CUIT."
- "Cancelar un proyecto mintea al developer un token de reputación negativa."
- "La insignia ERC-1155 por hito votado está confirmada, no es opcional."
- "El comprador es un rol propio: solo ve proyectos que llegaron a la etapa de venta,
  y su depósito se reembolsa si su oferta no resulta elegida."
- "Una votación se cierra antes de tiempo si vota el 100% del FDT en circulación."

## Paso 2 — Ubicar la implementación correspondiente

Para cada afirmación, buscar el código que la implementa:

- Reglas on-chain → `contracts/FenrirFactory.sol`, `FenrirProject.sol`,
  `FenrirToken.sol`, `FenrirGovernor.sol`.
- Reglas off-chain → `backend/src/` (sobre todo `services/` y `models/`, ver skill
  `backend-architecture`): verificación de CUIT, listener de eventos on-chain, server
  de reportes de hitos y su hash.
- Reglas de flujo/UI → `frontend/src/`.

Si no se encuentra código que implemente una afirmación, es un hallazgo de tipo "no
implementado" — no se descarta solo porque no haya código todavía.

## Paso 3 — Reportar

Clasificar cada afirmación:

- ✅ **Cumple** — el código implementa la regla tal como está documentada. Citar
  archivo:línea.
- ⚠️ **Diverge** — hay código relacionado pero el comportamiento no coincide (ej.
  libera fondos al declarar en vez de al aprobar). Explicar la diferencia exacta.
- ❌ **No implementado** — no existe código para esa afirmación todavía.
- ❓ **Ambiguo** — la afirmación no es lo bastante específica para verificarla en
  código, o dos archivos de `business_rules/` se contradicen entre sí.

No marcar como hallazgo lo que el propio
[`business_rules/decisiones-pendientes.md`](../../../business_rules/decisiones-pendientes.md)
señala como pendiente — son decisiones explícitamente abiertas, no bugs.

## Qué no hacer

- No inventar reglas de negocio que no estén en `business_rules/`.
- No tratar el código como fuente de verdad: si el código y `business_rules/` no
  coinciden, el documento manda. El hallazgo es "el código está desactualizado o mal",
  nunca al revés. Si en realidad el equipo cambió de idea y es el documento el que
  quedó viejo, eso se resuelve actualizando `business_rules/` primero, no ajustando el
  reporte para que el código "pase".
- No mezclar esta auditoría con revisión de estilo o arquitectura (capas del backend,
  composición de componentes de frontend) — para eso ya existen `backend-architecture`
  y `frontend-developer`.

## Formato de salida sugerido

Markdown agrupado por archivo de origen dentro de `business_rules/` (ej.
"`ciclo-de-hitos.md`" o "`venta-y-reparto.md`"), cada afirmación con su estado
(✅/⚠️/❌/❓) y la referencia de código correspondiente, o la ausencia de ella.
