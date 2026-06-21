# Parámetros globales

Estos valores son fijos para **todo el sistema** — no se configuran por proyecto al llamar a `FenrirFactory`. Esto revisa una decisión anterior que los trataba como parámetros por proyecto.

| Parámetro | Valor | Notas |
|---|---|---|
| Comisión del desarrollador | **10%** | Sobre el precio final de venta (Inversión) o sobre el total recaudado (Cívico) — ver [fondeo-y-comision.md](fondeo-y-comision.md) |
| Quórum | **51%** | Del FDT en circulación tiene que participar para que una votación sea válida |
| Umbral de aprobación | **51%** | De los votos emitidos tienen que ser "Sí" para que el hito se apruebe |
| Período de votación | **1 minuto** | Con cierre anticipado si vota el 100% del FDT en circulación — ver [ciclo-de-hitos.md](ciclo-de-hitos.md) |
| Plazo de reintento tras un rechazo | **2 minutos** | Tiempo que tiene el desarrollador para volver a declarar el hito rechazado |
| Tope de reintentos por hito | **2** (3 votaciones en total) | Ya documentado como regla fija en [ciclo-de-hitos.md](ciclo-de-hitos.md) |
| Penalización por hito rechazado | `comisión / (cantidad_de_hitos × tope_de_reintentos)` | Ver fórmula abajo |

Estos sí siguen siendo propios de cada proyecto (no son parámetros de gobernanza, son datos del negocio en sí): FF, FMPA, TTL de fondeo, la cantidad de hitos de obra y su presupuesto, y el precio estimado de venta.

## Fórmula de penalización

Cada rechazo de un hito descuenta, de forma acumulativa, una porción fija de la comisión:

```
penalización_por_rechazo = c / (ch × rph)
```

- `c` = comisión (10%, fija)
- `ch` = cantidad de hitos de obra del proyecto (varía por proyecto — es un dato del proyecto, no un parámetro de gobernanza)
- `rph` = tope de reintentos por hito (2, fijo)

Esto asegura que, en el peor caso (todos los hitos rechazados el máximo de veces permitido antes de aprobarse), la penalización acumulada nunca supere el 100% de la comisión — consistente con la regla de que la comisión nunca es negativa (ver [fondeo-y-comision.md](fondeo-y-comision.md)).
