# Feature Specification: Servidor backend de Fenrir (API + espejo on-chain)

**Feature Branch**: `001-express-backend-server`

**Created**: 2026-06-21

**Status**: Draft

**Input**: User description: "Crear el servidor backend de Fenrir en Express + TypeScript, siguiendo la arquitectura en capas definida en la constitución (Thin Controllers → Services → Models/DAOs, Middlewares, manejo centralizado de excepciones vía FenrirException) y el stack fijado (Prisma + PostgreSQL, Zod, Docker). El servidor debe exponer la API REST que el frontend va a consumir y debe escuchar los eventos on-chain de los contratos de `/contracts` vía ethers.js para mantener una copia rápida y consultable del estado on-chain en PostgreSQL, cubriendo roles, tipos de proyecto, tokens, ciclo de hitos, venta y reparto, fondeo y comisión, parámetros globales y casos borde documentados en `business_rules/`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Catálogo y estado de proyectos sin leer la blockchain (Priority: P1)

Cualquier visitante (inversor potencial, vecino, comprador) puede ver la lista de proyectos Fenrir y el detalle de uno — tipo, estado, progreso de fondeo, hitos y etapa de venta — siempre reflejando lo que ya ocurrió on-chain, sin que el navegador tenga que leer la blockchain directamente.

**Why this priority**: Es la base que toda otra pantalla del frontend consume. Sin un espejo confiable del estado on-chain no hay producto.

**Independent Test**: Crear y fondear un proyecto on-chain (vía Remix/Sepolia) y verificar que, sin abrir un explorador de bloques, los endpoints de catálogo y detalle del backend muestran el estado correcto apenas cada evento se confirma.

**Acceptance Scenarios**:

1. **Given** un proyecto creado on-chain vía `FenrirFactory`, **When** se mina el evento `ProjectCreated` correspondiente, **Then** el proyecto aparece en el catálogo con su tipo, estado `Funding` y fondeo acumulado en cero.
2. **Given** una inversión confirmada on-chain, **When** se procesa el evento `Invested`, **Then** el detalle del proyecto refleja el nuevo total recaudado y la wallet del inversor pasa a tener su FDT proporcional reflejado, sin que el cliente haya leído la blockchain.
3. **Given** una wallet sin FDT y sin registro de desarrollador (rol comprador), **When** solicita el catálogo, **Then** solo recibe proyectos en etapa `Selling`, excluyendo `Funding`, `Building` y `Cancelled`.

---

### User Story 2 - Declaración de hitos con reporte completo y hash verificable (Priority: P1)

El desarrollador declara un hito adjuntando un reporte completo (texto extendido, fotos, videos, documentos). El backend lo guarda, lo sirve en una URL estable, y ese contenido coincide siempre con el hash que termina yendo on-chain.

**Why this priority**: Es el corazón del modelo híbrido de confianza (registro liviano on-chain + contenido verificable off-chain) que fija la constitución del proyecto. Sin esto, el hash on-chain no significa nada para un inversor real.

**Independent Test**: Subir el reporte de un hito, obtener la URL y el hash que el desarrollador debe incluir en la transacción on-chain `declareMilestone`, y confirmar luego que un GET a esa URL devuelve exactamente el contenido cuyo SHA-256 coincide con el `reportHash` emitido on-chain.

**Acceptance Scenarios**:

1. **Given** un desarrollador registrado, dueño del hito actualmente pendiente, **When** envía el contenido de su reporte (texto + medios + documentos), **Then** el backend calcula y devuelve un hash SHA-256 y una URL estable para usar en la transacción on-chain.
2. **Given** un reporte ya servido en una URL, **When** llega el evento on-chain `MilestoneDeclared` con su `reportHash`, **Then** el backend verifica que el hash del contenido guardado coincide; si no coincide, la discrepancia queda señalada en vez de aceptarse en silencio.
3. **Given** cualquier visitante con la URL de un reporte, **When** hace GET, **Then** recibe el reporte completo (texto, medios, documentos), sin necesidad de wallet ni autenticación.

---

### User Story 3 - Estado de gobernanza y poder de voto por wallet (Priority: P2)

Un inversor conectado con su wallet puede ver, para un proyecto, las propuestas activas (hito, oferta de venta, elección de árbitro), su poder de voto según el snapshot vigente, si ya votó, y el resultado una vez resuelta.

**Why this priority**: El frontend nunca lee el estado on-chain directamente (principio de la constitución); sin este espejo no hay forma de mostrar "podés votar, quórum al Y%, te quedan X minutos" sin forzar al usuario a un explorador de bloques.

**Independent Test**: Disparar una propuesta on-chain (declarar un hito ya fondeado), votar con dos wallets distintas, y verificar que el endpoint de la propuesta refleja quórum, conteo de votos y resultado a medida que cada voto se confirma.

**Acceptance Scenarios**:

1. **Given** una votación de hito abierta on-chain, **When** el backend procesa el evento `ProposalCreated`, **Then** la propuesta aparece con su bloque de snapshot, su plazo, y el poder de voto de la wallet consultante en ese snapshot.
2. **Given** votos emitidos on-chain, **When** se procesan los eventos `VoteCast`, **Then** el porcentaje de quórum alcanzado y el conteo a favor/en contra de la propuesta se actualizan.
3. **Given** una propuesta resuelta (por árbitro o al azar), **When** se procesa el evento de resolución, **Then** el resultado final y, en una elección de árbitro, la wallet electa, quedan reflejados.

---

### User Story 4 - Identidad y reputación del desarrollador (Priority: P2)

Antes de invertir, cualquier visitante puede consultar la identidad registrada de un desarrollador (razón social, CUIT) y su historial de reputación — proyectos completados vs. fallidos — incluyendo el material de verificación off-chain que la respalda.

**Why this priority**: La confianza en un proyecto de obra civil/inmobiliaria depende de saber quién está del otro lado; es la razón de ser del Certificado de Finalización y del Certificado de Proyecto Fallido.

**Independent Test**: Registrar un desarrollador on-chain, llevar dos de sus proyectos a desenlaces distintos (uno completado, uno cancelado), y verificar que el endpoint de perfil del desarrollador muestra ambos certificados enlazados a su proyecto de origen.

**Acceptance Scenarios**:

1. **Given** una wallet registrada como desarrollador on-chain, **When** se consulta por dirección de wallet, **Then** se devuelven razón social, CUIT, y cualquier material de verificación de identidad off-chain asociado.
2. **Given** un desarrollador con un proyecto completado y otro cancelado, **When** se solicita su perfil, **Then** aparecen tanto el Certificado de Finalización como el Certificado de Proyecto Fallido, cada uno enlazado a su proyecto.

---

### User Story 5 - Ofertas de compra y cierre de venta (solo Fenrir Inversión) (Priority: P3)

Un comprador externo ve únicamente los proyectos en etapa de venta, puede consultar las ofertas en curso, y -- una vez ejecutada la venta -- los inversores pueden ver el detalle del reparto disponible para reclamar.

**Why this priority**: Cierra el ciclo de vida de Fenrir Inversión. Sin visibilidad de esta etapa, el comprador no puede evaluar si su oferta tiene chances frente a otras, ni el inversor saber cuánto le toca.

**Independent Test**: Llevar un proyecto Inversión a etapa de venta, registrar dos ofertas competidoras, aprobar ambas on-chain, ejecutar la venta con la de mayor monto, y verificar que el backend refleja la oferta ganadora, el descarte (y reembolso) de la otra, y el pool de reparto disponible por inversor.

**Acceptance Scenarios**:

1. **Given** un proyecto en estado `Selling`, **When** un comprador lo solicita, **Then** ve el precio estimado (informativo) y todas las ofertas activas con su estado.
2. **Given** varias ofertas aprobadas, **When** la venta se ejecuta on-chain con la de mayor monto, **Then** el backend marca las demás como reembolsadas y expone el precio final de venta junto con la parte reclamable de cada inversor según su FDT.

---

### Edge Cases

- ¿Qué pasa si el backend pierde conexión con el nodo RPC y se atrasa respecto a los eventos on-chain? Debe poder reprocesar el historial perdido sin duplicar ni perder registros (ingestión idempotente).
- ¿Qué pasa si un reporte de hito se sube al backend pero el desarrollador nunca llega a declararlo on-chain? Queda accesible por su URL pero sin asociarse a ningún hito confirmado.
- ¿Qué pasa si una reorganización de bloques hace que un evento ya procesado se vuelva a emitir? El estado mirror no debe duplicar el efecto de ese evento.
- ¿Qué pasa si un comprador intenta consultar el detalle de un proyecto que todavía está en `Funding` o `Building`? El backend lo excluye de su vista (ver `business_rules/roles.md`).
- ¿Qué pasa si el hash calculado de un reporte no coincide con el `reportHash` emitido on-chain? Queda señalado como discrepancia visible, sin que el backend "corrija" silenciosamente ninguno de los dos lados.
- ¿Qué pasa si dos wallets distintas intentan registrarse como desarrollador con el mismo CUIT? Solo la primera wallet registrada para ese CUIT es válida (regla ya impuesta on-chain); el backend refleja ese mismo criterio en sus respuestas, no uno distinto.
- ¿Qué pasa si un proyecto se cancela antes de llegar a la etapa de venta? El backend deja de exponerlo a compradores y muestra el pool de reembolso a los inversores correspondientes.

## Requirements *(mandatory)*

### Functional Requirements

**Catálogo y espejo on-chain**

- **FR-001**: El sistema DEBE mantener, en su propia base de datos, una copia consultable del tipo, estado, totales de fondeo, estado de hitos y propuestas de gobernanza de cada proyecto Fenrir, sincronizada con los eventos on-chain emitidos por `FenrirFactory`, `FenrirProject`, `FenrirToken` y `FenrirGovernor`.
- **FR-002**: El sistema DEBE exponer un catálogo paginado de proyectos, filtrable como mínimo por tipo de proyecto (Inversión/Cívico) y por estado (Funding/Building/Selling/Completed/Cancelled).
- **FR-003**: El sistema DEBE exponer una vista de detalle por proyecto que incluya progreso de fondeo (FMPA/FF/total recaudado), la lista completa de hitos con su estado actual, y -- en Inversión -- la etapa de venta cuando corresponda.
- **FR-004**: El sistema DEBE restringir la vista de proyectos para el rol comprador a únicamente los que están en etapa `Selling`, excluyendo `Funding`, `Building` y `Cancelled` de esa vista.
- **FR-005**: El sistema DEBE reprocesar eventos on-chain que lleguen fuera de orden o después de una desconexión temporal del nodo sin crear registros duplicados (ingestión idempotente).

**Reportes de hito**

- **FR-006**: El sistema DEBE permitir que un desarrollador registrado envíe el contenido completo del reporte de un hito (texto extendido, fotos, videos, documentos) antes de declarar ese hito on-chain.
- **FR-007**: El sistema DEBE calcular un hash SHA-256 del contenido enviado y devolver ese hash junto con una URL estable, para que el desarrollador los incluya en su transacción on-chain de declaración del hito.
- **FR-008**: El sistema DEBE servir el contenido completo del reporte en esa URL a cualquier solicitante, sin requerir autenticación de wallet.
- **FR-009**: El sistema DEBE verificar, una vez observado el evento on-chain de declaración del hito, que el `reportHash` on-chain coincide con el hash del contenido almacenado en la URL reportada, y DEBE señalar cualquier discrepancia en vez de aceptar cualquiera de los dos valores en silencio.

**Gobernanza y votación**

- **FR-010**: El sistema DEBE reflejar cada propuesta de gobernanza (elección de árbitro/hito 0, votación de hito, oferta de venta) con su tipo, bloque de snapshot, plazo, progreso de quórum/umbral y resultado final una vez resuelta.
- **FR-011**: El sistema DEBE exponer, para una wallet y una propuesta dadas, el poder de voto de esa wallet en el snapshot de la propuesta y si ya emitió su voto.
- **FR-012**: El sistema DEBE reflejar el estado del árbitro por proyecto (árbitro actual, vacancia, re-elección en curso) a medida que ocurren elecciones y vacancias on-chain.

**Identidad y reputación del desarrollador**

- **FR-013**: El sistema DEBE exponer la identidad registrada de un desarrollador (razón social, CUIT) y cualquier material de verificación de identidad off-chain asociado, indexado por dirección de wallet.
- **FR-014**: El sistema DEBE exponer, por wallet de desarrollador, su historial de reputación completo: cada Certificado de Finalización y Certificado de Proyecto Fallido emitido a esa wallet, enlazado a su proyecto de origen.
- **FR-015**: El sistema DEBE reflejar la regla de una sola wallet válida por CUIT (impuesta on-chain) en cualquier respuesta donde se identifique a un desarrollador por CUIT.

**Etapa de venta**

- **FR-016**: El sistema DEBE exponer, para un proyecto en etapa `Selling`, todas las ofertas de compra con su monto, estado (en votación/aprobada/rechazada/reembolsada/ejecutada) y wallet del comprador.
- **FR-017**: El sistema DEBE exponer, una vez ejecutada la venta on-chain, el precio final, el pool de reparto resultante, y la parte actualmente reclamable de cada inversor según su FDT.

**Inversores: historial y reclamos**

- **FR-018**: El sistema DEBE exponer, por wallet de inversor, su historial de inversión por proyecto y lo que actualmente puede reclamar (reembolso o reparto) según el estado resuelto del proyecto.
- **FR-019**: El sistema DEBE actualizar el historial de reclamos de un inversor en cuanto se observan los eventos on-chain de reembolso o reparto correspondientes.

**Restricciones del sistema**

- **FR-020**: El sistema NO DEBE tomar ninguna decisión de negocio que los contratos ya resuelven (umbrales de aprobación, cálculo de penalización, liberación de tranches) — únicamente refleja y reporta el estado ya calculado on-chain.
- **FR-021**: El sistema DEBE leer toda configuración específica de entorno (endpoint RPC, direcciones de contratos, conexión a base de datos) desde variables de entorno, nunca hardcodeada.

### Key Entities

- **Project**: una instancia de Fenrir Inversión o Cívico; su tipo, estado de ciclo de vida y progreso de fondeo.
- **Developer**: identidad registrada de un desarrollador (razón social, CUIT, wallet) y el material de verificación off-chain que la respalda.
- **Milestone**: una etapa de obra (incluido el hito 0 y, en Inversión, el hito final de venta), con su presupuesto, plazo, estado y conteo de reintentos.
- **MilestoneReport**: el contenido completo (texto, fotos, videos, documentos) de un hito declarado, servido por URL y verificado contra su hash on-chain.
- **Investment**: un aporte de un inversor a un proyecto, su monto y el FDT correspondiente recibido.
- **Proposal**: una votación del DAO (elección de árbitro, hito, oferta de venta) con su snapshot, plazo, quórum y resultado.
- **Vote**: el voto emitido por una wallet sobre una propuesta, con su peso.
- **SaleOffer**: una oferta de un comprador sobre un proyecto en etapa de venta.
- **ReputationCertificate**: un Certificado de Finalización o de Proyecto Fallido emitido a un desarrollador.
- **Claim**: un reclamo de reembolso o de reparto realizado por un inversor sobre un proyecto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visitante puede ver el estado de fondeo actualizado de un proyecto dentro de los 30 segundos posteriores a que la inversión se confirme on-chain, sin recargar manualmente ni usar un explorador de bloques.
- **SC-002**: El 100% de los reportes de hito servidos por el backend tienen un hash verificable que coincide con el hash on-chain correspondiente, o quedan explícitamente marcados como discrepantes.
- **SC-003**: Un comprador externo nunca ve, a través del catálogo o el detalle, un proyecto que todavía no llegó a la etapa de venta o que fue cancelado.
- **SC-004**: Un inversor puede determinar cuánto tiene actualmente disponible para reclamar (reembolso o reparto) en un proyecto sin leer la blockchain directamente.
- **SC-005**: Tras una interrupción temporal de conexión con el nodo de la red, el sistema recupera el estado on-chain perdido sin duplicar ni perder eventos, dentro de un ciclo de reintento razonable.

## Assumptions

- El backend nunca ejecuta una transacción on-chain en nombre del usuario (invertir, votar, declarar un hito, etc. las firma siempre la wallet del usuario desde el frontend); el backend solo prepara datos (hash + URL del reporte) y refleja lo ya confirmado on-chain.
- La autenticación de los endpoints de escritura (subir el reporte de un hito, subir material de verificación de identidad) se resuelve verificando la firma de la wallet correspondiente, sin contraseñas tradicionales, consistente con que el resto del sistema opera por wallet.
- Los archivos de fotos/videos/documentos de un reporte de hito se aceptan dentro de límites de tamaño razonables para una demo universitaria; no se diseña para volúmenes de producción.
- La verificación de identidad del desarrollador sigue siendo la fijada en `business_rules/roles.md` (razón social + CUIT, solo con validación de dígito verificador, sin consultar un padrón real); cualquier material adicional que el backend acepte es complementario y no reemplaza esa regla.
- El listener de eventos on-chain corre como parte del propio backend (no como un servicio aparte), consistente con el Principio I de la constitución.
- Esta feature cubre la API y el espejo on-chain del backend; no incluye el frontend (`client/`), el pipeline de compilación/deploy de los contratos, ni la migración a Supabase.
