#!/usr/bin/env node
// Verifica la regla de la constitution (Principio V): cada modulo que usa variables
// de entorno las lee, valida y exporta en UN SOLO archivo de config dedicado
// (p.ej. server/src/config/env.ts), y el resto del codigo importa de ahi en vez de
// tocar el entorno crudo (`process.env` / `import.meta.env`) directamente.
//
// El script escanea client/, server/ y shared/ y reporta, por cada acceso crudo al
// entorno, si ocurre en el archivo de config permitido o fuera de el (violacion).
//
// Heuristica, no un parser: busca `process.env` / `import.meta.env` por texto en
// archivos .ts/.tsx. Es el punto de partida; el veredicto final lo da una persona/agente
// (un match puede estar en un comentario o string). El archivo de config permitido por
// raiz es, por convencion, el que termina en `config/env.ts` (o .tsx).
//
// Uso:  node scan-env-access.mjs [repoRoot]   (por defecto: cwd)
//       --json   imprime JSON en vez del reporte markdown

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const repoRoot = args.find((a) => !a.startsWith("--")) ?? process.cwd();
const ROOTS = ["client", "server", "shared"];

// Acceso crudo al entorno: process.env (Node) e import.meta.env (Vite/cliente).
const ENV_RE = /\b(?:process\.env|import\.meta\.env)\b/;
// El archivo de config permitido por raiz (convencion del proyecto).
const CONFIG_RE = /(?:^|\/)config\/env\.tsx?$/;

const IGNORE_DIRS = new Set(["node_modules", "dist", "build", ".next", "coverage", "out"]);

/** @returns {string[]} rutas absolutas de .ts/.tsx (sin .d.ts) bajo dir */
function walk(dir) {
  let out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (IGNORE_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out = out.concat(walk(full));
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

// Recolectar accesos crudos al entorno por raiz.
/** @type {{root:string, file:string, line:number, text:string, isConfig:boolean}[]} */
const hits = [];
/** @type {Map<string, Set<string>>} raiz -> set de archivos de config detectados */
const configFiles = new Map(ROOTS.map((r) => [r, new Set()]));

for (const root of ROOTS) {
  for (const abs of walk(join(repoRoot, root))) {
    const rel = relative(repoRoot, abs).split(sep).join("/");
    const isConfig = CONFIG_RE.test(rel);
    const text = readFileSync(abs, "utf8");
    text.split(/\r?\n/).forEach((line, i) => {
      if (!ENV_RE.test(line)) return;
      if (isConfig) configFiles.get(root).add(rel);
      hits.push({ root, file: rel, line: i + 1, text: line.trim(), isConfig });
    });
  }
}

const violations = hits.filter((h) => !h.isConfig);
const configHits = hits.filter((h) => h.isConfig);

// Estado por raiz: cuantos archivos de config (idealmente 0 o 1) y cuantas violaciones.
const byRoot = ROOTS.map((root) => ({
  root,
  configModules: [...configFiles.get(root)],
  violations: violations.filter((v) => v.root === root),
}));

if (asJson) {
  console.log(JSON.stringify({ byRoot, violations, configHits }, null, 2));
  process.exit(0);
}

// --- Reporte markdown ---
const out = [];
out.push("# Reporte de centralizacion de env vars (Principio V)");
out.push("");
out.push(`Raiz analizada: \`${repoRoot}\``);
out.push("");
out.push(
  "Regla: cada modulo que usa variables de entorno las lee/valida/exporta en **un solo** " +
    "archivo de config (`config/env.ts`); el resto importa de ahi y no toca " +
    "`process.env` / `import.meta.env` directamente.",
);
out.push("");

out.push("## Resumen por raiz");
out.push("");
out.push("| Raiz | Archivo(s) de config | Accesos crudos fuera del config |");
out.push("|---|---|---|");
for (const r of byRoot) {
  const cfg =
    r.configModules.length === 0
      ? "_(ninguno)_"
      : r.configModules.map((c) => `\`${c}\``).join(", ");
  const flag = r.violations.length === 0 ? "✅ 0" : `🔴 ${r.violations.length}`;
  out.push(`| \`${r.root}/\` | ${cfg} | ${flag} |`);
}
out.push("");

out.push("## 🔴 Violaciones — entorno crudo fuera del archivo de config");
out.push("");
if (violations.length === 0) {
  out.push("_Sin hallazgos: ningun archivo toca `process.env` / `import.meta.env` fuera de su config module._");
} else {
  out.push(
    "Cada linea lee el entorno crudo fuera del archivo de config de su raiz. Debe importar " +
      "el valor tipado/validado desde el config module en vez de acceder al entorno directamente.",
  );
  out.push("");
  for (const v of violations) {
    out.push(`- \`${v.file}:${v.line}\` — \`${v.text}\``);
  }
}
out.push("");

// Aviso de multiples config modules por raiz (deberia haber a lo sumo uno).
const multi = byRoot.filter((r) => r.configModules.length > 1);
if (multi.length > 0) {
  out.push("## ⚠️ Mas de un archivo de config por raiz");
  out.push("");
  out.push("Deberia haber **un solo** archivo de config por raiz. Estas raices tienen varios:");
  for (const r of multi) {
    out.push(`- \`${r.root}/\`: ${r.configModules.map((c) => `\`${c}\``).join(", ")}`);
  }
  out.push("");
}

out.push("## ⚪ Accesos dentro del config (permitidos)");
out.push("");
if (configHits.length === 0) {
  out.push("_Ninguna raiz declara un config module que lea el entorno (puede ser que ninguna use env vars todavia)._");
} else {
  for (const h of configHits) {
    out.push(`- \`${h.file}:${h.line}\` — \`${h.text}\``);
  }
}
out.push("");

console.log(out.join("\n"));
