# Tipos de proyecto

| Aspecto | Fenrir Inversión | Fenrir Cívico |
|---|---|---|
| Quién aporta | Inversores que buscan retorno | Vecinos o el municipio |
| Cierre del proyecto | Venta del inmueble y reparto proporcional | Último hito de obra; sin reparto económico |
| Poder de voto | 1 FDT = 1 voto | 1 FDT = 1 voto, o "1 wallet = 1 voto" (configurable) |
| FDT al finalizar | Se quema al reclamar el reparto | Permanece en la wallet como comprobante de participación |
| Base de la comisión del desarrollador | % sobre el precio final de venta | % sobre el total recaudado, reservado desde el inicio |

Ambos tipos se crean desde el mismo `FenrirFactory`, pasando un parámetro de tipo de proyecto. Comparten toda la infraestructura de tokens, hitos, votación y arbitraje.
