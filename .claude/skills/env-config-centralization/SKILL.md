---
name: env-config-centralization
description: Verifica la regla de la constitution (Principio V) de que cada modulo/servicio de Fenrir que usa variables de entorno las lee, valida y exporta en UN SOLO archivo de config dedicado (p.ej. server/src/config/env.ts) y el resto del codigo importa de ahi en vez de tocar process.env / import.meta.env directamente, y produce un reporte. Usar antes de un PR, al agregar o tocar variables de entorno, al crear un servicio nuevo, o cuando se pida explicitamente auditar/validar la centralizacion de la configuracion. Incluye un script de escaneo (scripts/scan-env-access.mjs) y los criterios para interpretarlo. Es un rol de analisis y reporte de solo lectura: corre el escaneo, confirma los hallazgos leyendo el codigo y entrega el reporte; no edita codigo.
---

# Centralizacion de env vars (un solo config module por modulo)

La **constitution** (Principio V, seccion "Single env-config module per module") fija
una regla tajante: cada modulo/servicio que consume variables de entorno las **lee,
valida y exporta en un unico archivo de config dedicado** — `server/src/config/env.ts`
para el backend, un archivo equivalente para `client/` o cualquier otra raiz que use
config. Ese archivo es el **unico** lugar autorizado a tocar el entorno crudo
(`process.env` en Node, `import.meta.env` en el cliente Vite); el resto del codigo
importa de ahi los valores ya tipados y validados, y **no** accede al entorno directo.
La validacion es **fail-fast**: el config module parsea/valida al cargar (Zod) y tira
si falta o esta mal una variable, para que un servicio mal configurado nunca arranque.

Esta skill audita el cumplimiento de esa regla y produce un reporte. Es un rol de
**analisis y reporte**, no de edicion: detecta y recomienda; la correccion la hace el
agente `developer` (con `backend-architecture`) o quien corresponda.

## Como correr el escaneo

```bash
node .claude/skills/env-config-centralization/scripts/scan-env-access.mjs
```

Desde la raiz del repo. Imprime un reporte markdown. Acepta `--json` para salida
estructurada, y un primer argumento opcional con la raiz del repo si no se corre desde
ahi.

El script es una **heuristica** (busca `process.env` / `import.meta.env` por texto en
`.ts/.tsx`, no es un parser): es el punto de partida, no el veredicto. El archivo de
config permitido por raiz es, por convencion, el que termina en `config/env.ts` (o
`.tsx`). Todo hallazgo se confirma leyendo el codigo.

## Como leer el reporte

### Resumen por raiz

Una tabla con, por cada raiz (`client/`, `server/`, `shared/`): el/los archivo(s) de
config detectados y cuantos accesos crudos al entorno hay **fuera** de ese config. Lo
sano es: exactamente un archivo de config (o ninguno, si la raiz no usa env vars) y
**0** accesos fuera de el.

### 🔴 Violaciones — entorno crudo fuera del config

Cada linea que lee `process.env` / `import.meta.env` en un archivo que **no** es el
config module de su raiz. Es el hallazgo central: ese codigo debe importar el valor
tipado/validado desde el config module (`env.PORT`, `env.DATABASE_URL`, ...) en vez de
leer el entorno directo. Confirmar leyendo cada archivo antes de reportarlo como real:

- **Acceso real** (lee una variable de entorno para usarla) → violacion: mover la
  lectura al config module y exportar el valor, e importar desde ahi. Reportar en rojo.
- **Falso positivo** (la cadena aparece en un comentario, un string de log, o una
  doc) → descartarlo y anotarlo, para que no vuelva a saltar.

### ⚠️ Mas de un config module por raiz

Deberia haber **un solo** archivo de config por raiz. Si una raiz tiene varios, hay que
consolidarlos en uno; tener la lectura de env repartida en dos archivos es justo lo que
la regla evita.

### ⚪ Accesos dentro del config (permitidos)

Los accesos al entorno que **si** estan en el config module. Se listan solo para dejar
constancia de cual es el archivo fuente de verdad de cada raiz; no son hallazgos.

## Formato del reporte final

Despues de correr el script y confirmar leyendo el codigo, entregar:

1. **Resumen** — por raiz: config module(s) detectado(s) y cantidad de violaciones
   reales (tras descartar falsos positivos).
2. **🔴 Violaciones a corregir** — por cada una: `archivo:linea`, que variable lee, y
   cual es el config module al que deberia moverse / desde donde importar.
3. **⚠️ Config duplicado** — raices con mas de un archivo de config, a consolidar.
4. **Veredicto** — si el repo cumple el Principio V o no, en una linea.

No editar codigo en esta skill: el reporte es el entregable.
