# Fondeo, custodia de fondos y comisión del desarrollador

Al crear el proyecto se definen estos montos:

- **FF (meta de fondeo)** — la suma de los presupuestos de todos los hitos de obra (ej. Hito 1 = 70, Hito 2 = 10, Hito 3 = 20 → FF = 100). Es lo que cierra la ronda de inversión.
- **FMPA (Fondo Mínimo Para Arrancar)** — un umbral menor, con la restricción de ser como mínimo el costo del primer hito de obra (`FMPA >= costo del Hito 1`). Apenas se alcanza, dispara el Hito 0 (ver [ciclo-de-hitos.md](ciclo-de-hitos.md)) y arranca la obra — pero **no cierra la ronda de inversión**.
- **TTL de fondeo** — plazo límite para alcanzar el FMPA, definido por el desarrollador al crear el proyecto (parámetro on-chain, público). Si se vence sin llegar al FMPA, el proyecto se cancela y se reembolsa el 100% de lo recaudado hasta ese momento (ver [casos-borde.md](casos-borde.md)).

La ronda de inversión se cierra recién al alcanzar el **FF**; entre el FMPA y el FF la obra ya está en marcha pero todavía pueden sumarse inversores nuevos y emitirse FDT. Si la inversión que finalmente alcanza el FF lo supera, el excedente se acepta sin problema: el FDT emitido es siempre proporcional al monto realmente aportado.

El presupuesto de obra queda dividido en una tranche por hito (montos definidos al crear el proyecto). La tranche del primer hito de obra se libera automáticamente al arrancar el proyecto (con el FMPA), como capital inicial. Las tranches del resto de los hitos se liberan cuando se **aprueba** la votación de ese hito (ver [ciclo-de-hitos.md](ciclo-de-hitos.md)) **y** ya se recaudó el monto acumulado necesario para cubrirla — si el DAO aprueba un hito antes de que ese dinero haya llegado (porque la ronda sigue abierta y la inversión va más lenta que la obra), la liberación queda pendiente hasta completar el monto. Un rechazo, en cualquier caso, no libera nada hasta que un reintento se apruebe.

La excepción es Fenrir Cívico, donde además se reserva desde el inicio el % de comisión sobre el total recaudado (ver más abajo); en Fenrir Inversión la comisión se calcula sobre el precio final de venta, recién al cerrarse esa venta, así que no hay nada que reservar de entrada.

## Comisión y penalización

Único mecanismo de incentivo/penalización económica (no hay depósito de garantía inicial; el desarrollador solo puede usar fondos de los inversores):

- El desarrollador cobra esa **comisión final**, recién al completar el proyecto con éxito. La tasa es **10%, fija para todo el sistema** (ver [parametros-globales.md](parametros-globales.md)).
  - En Inversión: 10% sobre el precio final de venta.
  - En Cívico: 10% sobre el total recaudado, reservado desde el inicio del proyecto.
- Por cada hito que el DAO rechace, se descuenta una porción fija de esa comisión, de forma acumulativa, según la fórmula `comisión / (cantidad_de_hitos × tope_de_reintentos)` (ver [parametros-globales.md](parametros-globales.md)). La comisión nunca es negativa: si las penalizaciones la superan, el desarrollador no cobra extra, pero tampoco queda debiendo.
