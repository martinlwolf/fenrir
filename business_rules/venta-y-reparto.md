# Hito final de venta y reparto (solo Fenrir Inversión)

El último hito de la lista es siempre la venta del inmueble. A diferencia del resto de los hitos:

- El dinero entra al contrato en vez de salir.
- Cada oferta de compra ("postor") dispara su propia propuesta de venta votable — puede haber más de una oferta a lo largo del tiempo.
- Votan tanto los inversores (con FDT) como el propio desarrollador, no solo el DAO de inversores — el desarrollador vota con el mismo peso que 1 FDT, sin veto ni peso especial (informalmente, este grupo es "el grupo de vendedores").
- El **precio mínimo** definido al crear el proyecto es un valor estimativo/informativo, no una regla que el contrato haga cumplir: no rechaza ofertas por estar por debajo de ese valor. Es válido aceptar una oferta menor a la estimada si el conjunto de votantes prefiere cerrar la venta, aunque la ganancia sea baja, a seguir esperando.
- Usa el mismo quórum y umbral que el resto de los hitos del proyecto — no tiene parámetros de votación propios.
- Puede haber **varias ofertas con votación en curso al mismo tiempo**. Si más de una llega a aprobarse, se ejecuta la de mayor precio entre las aprobadas; las demás (aprobadas o todavía en votación) quedan descartadas una vez que la venta se concreta.
- Quien hace una oferta es el rol de **comprador** (ver [roles.md](roles.md)). Cada oferta requiere depositar el monto ofertado en el contrato; si no resulta elegida (rechazada en su votación, o superada por una mejor oferta aprobada), el depósito se reembolsa automáticamente.

## Reparto entre los inversores, una vez aprobada la venta

1. El precio final de venta (P) ingresa al contrato.
2. Se calcula la comisión final del desarrollador: % fijo × P, menos las penalizaciones acumuladas (ver [fondeo-y-comision.md](fondeo-y-comision.md)) — nunca negativa.
3. El desarrollador reclama su comisión; el resto (P − comisión) queda como pool de reparto.
4. Cada inversor reclama su parte proporcional: `(su FDT) / (FDT en circulación en ese momento) × pool de reparto`. Al reclamar, se queman sus FDT (evita el doble reclamo). El orden en que reclaman no afecta la proporción de los que faltan, porque el pool y el FDT en circulación se reducen juntos.
5. No importa cuándo invirtió cada uno (durante el FMPA inicial o más tarde, mientras la ronda seguía abierta) — el FDT es siempre proporcional al monto realmente aportado, sin ajuste por el momento de la inversión.

En Fenrir Cívico no existe esta etapa: el último hito es un hito de obra normal y, al aprobarse, el proyecto pasa directo a completado.
