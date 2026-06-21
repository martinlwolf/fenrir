# Ciclo de vida de un hito

Todo proyecto tiene siempre dos hitos fijos, además de los hitos de obra que se definan al crearlo. Si el proyecto nunca llega a juntar el FMPA, se cancela automáticamente al vencer un **TTL de fondeo** (ver [fondeo-y-comision.md](fondeo-y-comision.md)) — el reembolso es del 100% de lo aportado, porque todavía no se gastó nada en obra.

**Hito 0 — elección de árbitro.** Se dispara automáticamente apenas el proyecto alcanza el **FMPA** (Fondo Mínimo Para Arrancar, ver [fondeo-y-comision.md](fondeo-y-comision.md)). No lo declara el desarrollador y **no cierra la ronda de inversión** — todavía puede faltar financiar el resto de los hitos. Es una votación más del DAO, con snapshot de FDT:
- Candidatos: cualquier inversor del proyecto. El desarrollador no puede invertir en su propio proyecto, así que tampoco puede ser candidato.
- Si no se alcanza quórum, o hay empate de votos, se elige al azar — entre todos los inversores (sin quórum) o entre los empatados — usando un hash de `blockhash` + `timestamp` + id de propuesta. No interviene un árbitro porque todavía no hay ninguno electo. Esta fuente de azar sirve para la demo pero no resiste manipulación de validadores; con fondos reales habría que migrar a algo como Chainlink VRF.
- Si el árbitro electo transfiere todo su FDT y deja de ser inversor del proyecto, pierde el rol y se repite este mismo proceso de elección.

**Último hito.** En Fenrir Inversión es siempre la venta del inmueble (ver [venta-y-reparto.md](venta-y-reparto.md)); en Fenrir Cívico es el último hito de obra, sin etapa de venta.

El ciclo de declaración/votación de los hitos de obra (no aplica al hito 0) es el siguiente:

1. **Pendiente** — definido desde la creación del proyecto, con fecha límite. La tranche de presupuesto del **primer hito de obra** se libera automáticamente al arrancar el proyecto (apenas se resuelve el hito 0), para darle al desarrollador capital inicial sin depender de ningún voto.
2. **Declarado** — el desarrollador adjunta hash + URL del reporte. Antes de abrir la votación, el contrato chequea si ya está disponible el dinero del **próximo** hito:
   - Si sí, se crea la propuesta y se abre la votación (paso 3).
   - Si no, el proceso **se pausa de forma indefinida** — no se abre la votación — hasta que entre más inversión (la ronda sigue abierta entre el FMPA y el FF) o hasta que los inversores decidan cancelar el proyecto (ver [casos-borde.md](casos-borde.md)).
3. **En votación** — el DAO vota durante el período de votación (**1 minuto**, fijo para todo el sistema — ver [parametros-globales.md](parametros-globales.md)), usando snapshot de FDT. Si el 100% del FDT en circulación llega a votar antes de que venza el período, la votación se cierra antes — no hace falta esperar el resto del plazo.
4. **Aprobado** — se libera la tranche de presupuesto correspondiente a este hito (salvo la del primer hito de obra, ya liberada en el paso 1) y avanza al siguiente hito.
5. **Rechazado** — se penaliza la comisión final acumulada del desarrollador y no se libera la tranche de este hito. El desarrollador tiene un plazo de **2 minutos** (fijo para todo el sistema — ver [parametros-globales.md](parametros-globales.md)) para volver a declararlo. Cada hito admite hasta **2 reintentos** (3 votaciones en total) — tope fijo del sistema. El contador de reintentos es **independiente por hito**: no se acumula entre hitos distintos del mismo proyecto. Si la tercera votación de un mismo hito también lo rechaza, el proyecto se cancela.

Si se cancela el proyecto (máximo de reintentos agotado, plazo de reintento vencido, o el desarrollador no declaró antes del deadline), lo único reembolsable de forma proporcional a los inversores son las tranches de los hitos cuyo voto nunca se aprobó. La tranche automática del primer hito de obra y las de los hitos ya aprobados no son recuperables — son dinero ya volcado a la obra.
