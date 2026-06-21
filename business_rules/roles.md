# Roles del sistema

| Rol | Quién lo ocupa | Función |
|---|---|---|
| Desarrollador / Constructora | Empresa o persona que ejecuta la obra | Declara hitos, recibe el presupuesto liberado por hito y una comisión final |
| Inversor / Vecino | Quien aporta fondos | Recibe FDT, vota cada hito en el DAO |
| DAO | El conjunto de tenedores de FDT | Aprueba o rechaza cada hito por votación on-chain |
| Árbitro | Un inversor más, elegido por el DAO (wallet normal, sin multisig; en la demo de clase, el profesor) | Resuelve casos de falta de quórum y de empate |
| Comprador | Wallet externa interesada en adquirir el inmueble (no es desarrollador ni inversor del proyecto) | Solo ve proyectos que llegaron a la etapa de venta (obra completada); hace ofertas que disparan una votación entre los inversores y el desarrollador (ver [venta-y-reparto.md](venta-y-reparto.md)) |

**Nota sobre el árbitro:** no es un actor externo ni requiere una wallet especial — es uno de los propios inversores. Se elige por votación del DAO en el hito 0 de todo proyecto (mecánica completa, casos de empate, falta de quórum y pérdida del rol en [ciclo-de-hitos.md](ciclo-de-hitos.md)). El desarrollador no puede ser candidato porque no puede invertir en su propio proyecto. En la demo de clase, el profesor participa como un inversor más y suele resultar el elegido.

**Nota sobre identidad:** el desarrollador no es anónimo — debe registrar como mínimo razón social y CUIT antes de poder crear un proyecto (verificación off-chain; se valida al menos el dígito verificador del CUIT, sin consultar un padrón real como AFIP). La primera wallet que se registra con un CUIT queda como la única wallet válida para ese CUIT, para evitar que un desarrollador abandone una wallet manchada por fracasos ([tokens.md](tokens.md)) y arranque de cero con otra. Los inversores siguen siendo anónimos: alcanza con conectar una wallet, sin KYC.

**Nota sobre pérdida de acceso:** no existe ningún mecanismo de recuperación de wallet perdida o comprometida, ni para el desarrollador ni para los inversores — la custodia de la wallet es responsabilidad exclusiva de cada usuario. Queda fuera del alcance del sistema.

**Nota sobre el comprador:** es un rol sin relación previa con el proyecto — no necesita FDT ni haber invertido. Solo accede a la vista de proyectos en etapa de venta; no ve proyectos en construcción ni proyectos fallidos.
