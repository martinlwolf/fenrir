---
name: database
description: Capa de datos del backend de Fenrir (Prisma + PostgreSQL). Usar al diseñar o modificar `schema.prisma`, escribir o revisar DAOs y queries, configurar migraciones, índices o pooling de conexiones, o preparar el código para la futura migración a Supabase. Funciona como registry de `prisma-postgres` (conexiones, pooled vs. direct URL, provisioning, Prisma Client) y `supabase-postgres-best-practices` (performance de queries, índices, schema, RLS), y fija la convención del datasource con `url`/`directUrl` separados desde el día uno.
---

# Database (Fenrir)

## Capa que cubre

`schema.prisma`, migraciones y los DAOs (`backend/src/daos/`) — la única capa que
conoce el ORM (ver skill `backend-architecture`, sección DAOs). Esta skill no la
reemplaza: la complementa con el detalle específico de Prisma + Postgres.

## Contexto del proyecto

- **Hoy:** PostgreSQL administrado (Render Postgres o equivalente), accedido vía
  Prisma (`CLAUDE.md` §2/§8).
- **Mañana:** migración planeada a Supabase. El objetivo de esta skill es que ese
  cambio sea, en lo posible, solo de variables de entorno — no de código ni de schema.

## Registry de skills de base de datos

| Skill | Para qué sirve |
|---|---|
| [`prisma-postgres`](../prisma-postgres/SKILL.md) | Conexiones (pooled vs. direct), Prisma Client, migraciones, provisioning. Referencia para cómo Prisma maneja el `datasource db` y la diferencia entre la URL de la app y la URL de migraciones. |
| [`supabase-postgres-best-practices`](../supabase-postgres-best-practices/SKILL.md) | Performance de queries, índices, diseño de schema, manejo de conexiones, RLS. Como el destino final es Supabase, diseñar contra estas reglas desde el día uno evita rehacer queries o índices en la migración. |

Invocarlas explícitamente cuando corresponda — no asumir su contenido de memoria.
Ambas tienen detalle adicional en sus `references/` que conviene leer antes de
escribir SQL, definir índices, o tocar la configuración de conexión.

## Datasource: dos URLs desde el día uno

`schema.prisma` se define así desde ahora, aunque hoy las dos variables apunten al
mismo valor:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled, para la app
  directUrl = env("DIRECT_URL")     // directa, para las migraciones
}
```

- **`DATABASE_URL`** — la usa el Prisma Client en runtime (DAOs, queries de la app).
  Al migrar a Supabase, es la que apunta al pooler (Supavisor/PgBouncer, puerto 6543).
- **`DIRECT_URL`** — la usa `prisma migrate` / `prisma db push`. Los poolers de
  transacción no soportan lo que necesitan las migraciones (prepared statements, DDL
  en algunos casos), por eso Prisma requiere una conexión directa aparte. En Supabase
  es el puerto 5432.
- **Hoy** ambas variables valen lo mismo, porque todavía no hay pooler delante de la
  base. Se declaran las dos igual desde el principio, para que el día de la migración
  a Supabase el cambio sea solo pisar los valores en `.env`, sin tocar `schema.prisma`
  ni el código.
- Mantener `DATABASE_URL` y `DIRECT_URL` en el `.env.example` del backend, aunque hoy
  compartan valor (`CLAUDE.md` §4).

## Flujo de trabajo

1. **Schema** — modelar en `schema.prisma`. Para índices, tipos de columna y
   constraints, aplicar `supabase-postgres-best-practices` (categoría `schema-`).
2. **Migraciones** — generarlas con `prisma migrate dev` (local), que usa
   `DIRECT_URL`. Para dudas de provisioning o de conexión, consultar `prisma-postgres`.
3. **Prisma Client** — una sola instancia (singleton), importada solo desde los DAOs;
   nunca instanciar `new PrismaClient()` por archivo o por request (agota conexiones,
   sobre todo contra un pooler). Ver `prisma-postgres` (`console-and-connections`) para
   el patrón según el entorno (serverless vs. servidor long-running).
4. **DAOs y queries** — escribirlas pensando en performance desde el principio
   (índices que la query necesita, evitar N+1, `select` explícito en vez de traer el
   modelo entero). Aplicar `supabase-postgres-best-practices` (`query-`, `data-`,
   `lock-`).
5. **Conexiones** — configurar el límite de conexiones de Prisma pensando que en
   producción va a haber un pooler externo (Supabase) por delante; no asumir que cada
   conexión del lado de Prisma es 1:1 con una conexión real de Postgres una vez
   migrado.
6. **Seguridad** — hoy Prisma usa un único rol de servicio (no hay RLS por usuario
   final), pero tener presentes las reglas `security-` de `supabase-postgres-best-practices`
   para el día que se evalúe habilitar RLS en Supabase.

## Qué no hacer

- No escribir SQL crudo ni llamar a Prisma fuera de `daos/` (regla de
  `backend-architecture`).
- No hardcodear `DATABASE_URL`/`DIRECT_URL` ni ninguna connection string — siempre vía
  `.env` (`CLAUDE.md` §8).
- No diseñar el schema o las queries solo para que funcionen hoy contra Render
  Postgres si eso obliga a reescribirlas en la migración a Supabase — pensar los dos
  destinos a la vez.
