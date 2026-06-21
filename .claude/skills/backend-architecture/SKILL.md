---
name: backend-architecture
description: Aplica la arquitectura en capas del backend de Fenrir (Thin Controllers → Services → Models/DAOs, Middlewares, FenrirException) al crear o modificar código en server/ — rutas/controllers de Express, lógica de negocio, queries a la base de datos, excepciones, middlewares, validación con Zod o documentación de la API. Define también la convención de `shared/` para Zod schemas, constantes y tipos reusados por client/. Funciona también como registry: para tipos avanzados de TypeScript al generar interfaces, DTOs o tipos de request/response, registra `typescript-advanced-types`; para `schema.prisma`, migraciones, índices o pooling de conexiones, registra `database`. Usar también en modo revisión para detectar violaciones de capas en código backend existente (SQL u ORM fuera de un DAO, lógica de negocio en un controller, IDs en vez de objetos, excepciones casi duplicadas, falta de manejo de errores centralizado, o lógica de negocio filtrada a `shared/`).
---

# Arquitectura del backend de Fenrir

Backend en Express + TypeScript (ver `.specify/memory/constitution.md`). Esta skill
define las 6 capas del backend y las reglas de cada una. El objetivo: que la lógica de
negocio nunca se filtre a un controller (ni a `shared/`), que las queries nunca se
filtren fuera de un DAO, y que los errores se manejen siempre de la misma forma.

## Registry de skills

| Skill | Para qué sirve |
|---|---|
| [`typescript-advanced-types`](../typescript-advanced-types/SKILL.md) | Generics, conditional types, mapped types, template literals y utility types — invocarlo al generar interfaces, DTOs, tipos de request/response o cualquier tipo no trivial en `models/`, `daos/`, `schemas/` o `services/` |
| [`database`](../database/SKILL.md) | `schema.prisma`, migraciones, índices, pooling de conexiones y preparación para la migración a Supabase — invocarlo para cualquier cambio en `daos/` o en el schema que vaya más allá de una query simple |

Un `interface` simple de dos o tres campos no lo necesita. Un tipo condicional, un
mapped type, o un genérico reutilizable entre DAOs/services sí — ahí invocar
`typescript-advanced-types` directamente. Para todo lo que toca `schema.prisma`,
migraciones, índices o configuración de conexión, invocar `database` directamente.

## Estructura de carpetas sugerida

```
server/src/
├── controllers/      # Thin Controllers
├── services/          # Services
├── models/             # Models (objetos de negocio)
├── daos/                 # DAOs (única capa que toca el ORM)
├── middlewares/        # auth, error handling, formato de respuesta, roles
├── exceptions/          # FenrirException + subclases
├── schemas/             # esquemas Zod que NO comparte el frontend (solo este servicio)
├── routes/                # wiring de método+path → controller
└── docs/                   # config de swagger / openapi

shared/
├── schemas/             # esquemas Zod de request/response que también usa client/
├── constants/           # constantes (enums de estado, límites, etc.) usadas por ambos
└── types/                  # tipos/DTOs compartidos
```

**Regla de `schemas/` vs `shared/schemas/`:** si `client/` necesita el mismo esquema
Zod para validar formato antes de llamar a la API (la única validación de negocio
permitida en el frontend, ver constitution Principio II), ese esquema vive en
`shared/schemas/` y el controller lo importa de ahí — no se duplica uno igual en
`server/src/schemas/`. Lo que se queda en `server/src/schemas/` es exclusivamente
interno (nunca lo ve el frontend).

## 1. Controllers (`controllers/`) — flacos

Son la única capa que conoce el protocolo HTTP (`req`/`res`, status codes, headers,
query/params/body). Responsabilidades, nada más:

- Parsear y validar el input (idealmente con un schema de **Zod**), incluyendo el
  casteo de strings a number/boolean/Date.
- Llamar a **un** service.
- Devolver la respuesta (o delegar el formato final al middleware de errores/respuesta).

**No deben:**
- Contener reglas de negocio (`if` que decida algo del dominio).
- Importar un DAO o el cliente del ORM directamente.
- Acceder a APIs externas — **excepción**: si un *service* necesita consumir una API
  externa (ej. un RPC de Sepolia vía ethers.js, un servicio de terceros), esa llamada
  vive en el service, no en el controller. Es la única capa, aparte del controller,
  habilitada para hablar con el "afuera".

```typescript
// controllers/milestone.controller.ts
export async function declareMilestone(req: Request, res: Response) {
  const { projectId } = paramsSchema.parse(req.params);
  const body = declareMilestoneSchema.parse(req.body);

  const milestone = await milestoneService.declare(projectId, body);

  res.status(201).json(milestone);
}
```

## 2. Models (`models/`) — la lógica de negocio vive acá

Son objetos (clases), no DTOs planos. Pueden tener campos de tabla (`id`, `createdAt`,
`updatedAt`, etc.) pero la lógica que combina esos campos entre objetos relacionados
vive en los propios models, no en el service que los orquesta.

**Regla clave:** si un model recibe algo por parámetro que es una entidad relacionada,
recibe el **objeto**, no su id (`assignDeveloper(developer: Developer)`, nunca
`assignDeveloper(developerId: number)`). Resolver el id a objeto es trabajo del DAO o
del service, antes de llamar al model.

```typescript
// models/Project.ts
export class Project {
  constructor(
    public readonly id: number,
    public milestones: Milestone[],
    public developer: Developer,
  ) {}

  declareNextMilestone(reportUrl: string, reportHash: string): Milestone {
    const next = this.milestones.find((m) => m.status === "Pending");
    if (!next) throw new BadRequestException("No pending milestone to declare");
    next.declare(reportUrl, reportHash);
    return next;
  }
}
```

## 3. DAOs (`daos/`) — única capa que toca el ORM

Abstraen el ORM, que en este proyecto es **Prisma** (ver `.specify/memory/constitution.md`). **Toda**
query vive en un DAO; no puede existir una llamada a Prisma en ningún otro archivo. Un
DAO recibe/devuelve **entidades de `models/`**, nunca filas crudas del ORM.

```typescript
// daos/project.dao.ts
export async function findById(id: number): Promise<Project | null> {
  const row = await prisma.project.findUnique({
    where: { id },
    include: { milestones: true, developer: true },
  });
  return row ? toProjectModel(row) : null;
}
```

## 4. Services (`services/`) — terminan de aplicar la lógica

Orquestan: hablan con DAOs, con Models y a veces con otros Services. Acá vive el flujo
completo de un caso de uso (ej. "declarar un hito": buscar el proyecto vía DAO, pedirle
al Model que aplique la regla, persistir vía DAO, notificar a otro service).

```typescript
// services/milestone.service.ts
export async function declare(projectId: number, input: DeclareMilestoneInput) {
  const project = await projectDao.findById(projectId);
  if (!project) throw new NotFoundException("Project not found");

  const milestone = project.declareNextMilestone(input.reportUrl, input.reportHash);

  await milestoneDao.save(milestone);
  await blockchainService.emitMilestoneDeclared(milestone);

  return milestone;
}
```

## 5. Middlewares (`middlewares/`) — evitar repetir lógica

Para todo lo transversal: autenticación, manejo centralizado de errores, formateo de
respuestas, chequeo de roles (Desarrollador / Inversor / Árbitro, ver
`business_rules/roles.md`).
Si una validación o chequeo se repite en más de un controller, es candidato a
middleware.

```typescript
// middlewares/errorHandler.ts
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof FenrirException) {
    return res.status(err.status_code).json({
      error: err.error,
      error_code: err.error_code,
      details: err.details,
    });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal Server Error", error_code: "INTERNAL" });
}
```

## 6. Exceptions (`exceptions/`)

Una sola excepción genérica de la que heredan todas las demás:

```typescript
// exceptions/FenrirException.ts
export class FenrirException extends Error {
  constructor(
    public readonly error: string,
    public readonly error_code: string,
    public readonly status_code: number,
    public readonly details?: unknown,
  ) {
    super(error);
    this.name = new.target.name;
  }
}
```

```typescript
// exceptions/common.ts
export class BadRequestException extends FenrirException {
  constructor(error = "Bad Request", details?: unknown) {
    super(error, "BAD_REQUEST", 400, details);
  }
}

export class NotFoundException extends FenrirException {
  constructor(error = "Not Found", details?: unknown) {
    super(error, "NOT_FOUND", 404, details);
  }
}

export class UnauthorizedException extends FenrirException {
  constructor(error = "Unauthorized", details?: unknown) {
    super(error, "UNAUTHORIZED", 401, details);
  }
}

export class ForbiddenException extends FenrirException {
  constructor(error = "Forbidden", details?: unknown) {
    super(error, "FORBIDDEN", 403, details);
  }
}

export class ConflictException extends FenrirException {
  constructor(error = "Conflict", details?: unknown) {
    super(error, "CONFLICT", 409, details);
  }
}
```

**Regla:** antes de crear una excepción nueva (ej. `MilestoneNotFoundException`),
comprobar si `new NotFoundException("Milestone not found")` ya cubre el caso. Si dos
excepciones tienen el mismo `status_code` y el mismo comportamiento y solo cambia el
mensaje, **no** crear una subclase nueva — usar la genérica existente con el mensaje
como parámetro. Solo se justifica una subclase nueva si agrega campos o lógica propia.

## Validación (Zod) y manejo de errores

- Las librerías de este tipo (Zod para validación, alguna lib de manejo de errores) se
  pueden instalar libremente — no hay que reinventarlas a mano.
- Los schemas de Zod se parsean **en el controller**, nunca en el service ni en el
  model. Si el parseo falla, Zod tira; ese error lo captura el middleware de errores
  (envolverlo o mapearlo a `BadRequestException` si se necesita el formato uniforme).

## Documentación de la API

Documentar con Swagger/OpenAPI. Si ya se usan schemas de Zod para validar, preferir
generar el spec de OpenAPI a partir de esos mismos schemas (ej. con
`@asteasolutions/zod-to-openapi`) para no mantener dos definiciones del mismo contrato
por separado. Servir el spec resultante con `swagger-ui-express` en una ruta tipo
`/docs`.

## Checklist de revisión

- [ ] ¿El controller importa un DAO o el cliente del ORM directamente? → mover al service.
- [ ] ¿Hay un `if` de regla de negocio dentro de un controller? → mover a Model o Service.
- [ ] ¿Una query vive fuera de `daos/`? → moverla a un DAO.
- [ ] ¿Un Model recibe un id donde podría recibir el objeto relacionado? → cambiar la firma.
- [ ] ¿Se lanza un `Error` plano o una excepción nueva casi idéntica a una existente? → usar/heredar de `FenrirException`.
- [ ] ¿El `errorHandler` conoce los `error_code` nuevos que se están introduciendo?
- [ ] ¿La ruta nueva está documentada (swagger/openapi)?
