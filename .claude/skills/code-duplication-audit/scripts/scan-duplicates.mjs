#!/usr/bin/env node
// Escanea client/, server/ y shared/ en busca de declaraciones top-level
// (const, let, enum, type, interface, function, class) y reporta:
//   1. Duplicacion cross-area: el mismo identificador declarado en 2+ raices.
//   2. Simbolos de shared/ referenciados desde una sola raiz (candidatos a mover).
//   3. Simbolos de shared/ sin uso en client/ ni server/ (posible codigo muerto).
//
// Heuristica, no un parser: detecta declaraciones en columna 0 de archivos .ts/.tsx.
// La decision final (sobre todo el punto 2) la toma una persona/agente, porque hay
// excepciones legitimas: dependencias/herencias internas de shared/ que conviene
// mantener juntas. El script marca esas dependencias intra-shared para asistir el juicio.
//
// Uso:  node scan-duplicates.mjs [repoRoot]   (por defecto: cwd)
//       --json   imprime JSON en vez del reporte markdown

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const repoRoot = args.find((a) => !a.startsWith("--")) ?? process.cwd();
const ROOTS = ["client", "server", "shared"];

const DECL_RE =
  /^(export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(const|let|enum|type|interface|function|class)\s+([A-Za-z_$][\w$]*)/;

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

/** raiz (client/server/shared) a la que pertenece un path absoluto, o null */
function rootOf(absPath) {
  const rel = relative(repoRoot, absPath).split(sep)[0];
  return ROOTS.includes(rel) ? rel : null;
}

// 1. Recolectar declaraciones top-level por archivo.
/** @type {Map<string, {root:string, file:string, kind:string, line:number, exported:boolean}[]>} */
const decls = new Map();
/** @type {{root:string, abs:string, rel:string, text:string}[]} */
const files = [];

for (const root of ROOTS) {
  for (const abs of walk(join(repoRoot, root))) {
    const text = readFileSync(abs, "utf8");
    const rel = relative(repoRoot, abs).split(sep).join("/");
    files.push({ root, abs, rel, text });
    text.split(/\r?\n/).forEach((line, i) => {
      const m = DECL_RE.exec(line);
      if (!m) return;
      const [, exp, kind, name] = m;
      if (!decls.has(name)) decls.set(name, []);
      decls.get(name).push({ root, file: rel, kind, line: i + 1, exported: !!exp });
    });
  }
}

/** cuenta en que raices (de las dadas) aparece el identificador como palabra, ignorando su archivo de declaracion */
function referencingRoots(name, exclude) {
  const re = new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`);
  const found = new Set();
  for (const f of files) {
    if (!exclude.has(f.root)) continue;
    // saltear el archivo donde se declara (para no contar la propia definicion)
    const declaredHere = (decls.get(name) ?? []).some((d) => d.file === f.rel);
    if (declaredHere) continue;
    if (re.test(f.text)) found.add(f.root);
  }
  return found;
}

// 2. Duplicacion cross-area: identificador declarado en 2+ raices distintas.
const crossArea = [];
for (const [name, sites] of decls) {
  const roots = new Set(sites.map((s) => s.root));
  if (roots.size >= 2) crossArea.push({ name, sites, roots: [...roots] });
}
crossArea.sort((a, b) => a.name.localeCompare(b.name));

// 3. Simbolos de shared/ usados en una sola (o ninguna) raiz consumidora.
const sharedSymbols = [];
for (const [name, sites] of decls) {
  const sharedSites = sites.filter((s) => s.root === "shared" && s.exported);
  if (sharedSites.length === 0) continue;
  const consumers = referencingRoots(name, new Set(["client", "server"]));
  const intraShared = referencingRoots(name, new Set(["shared"])).has("shared");
  sharedSymbols.push({ name, sharedSites, consumers: [...consumers], intraShared });
}

const moveCandidates = sharedSymbols
  .filter((s) => s.consumers.length === 1)
  .sort((a, b) => a.name.localeCompare(b.name));
const orphanShared = sharedSymbols
  .filter((s) => s.consumers.length === 0)
  .sort((a, b) => a.name.localeCompare(b.name));

if (asJson) {
  console.log(JSON.stringify({ crossArea, moveCandidates, orphanShared }, null, 2));
  process.exit(0);
}

// --- Reporte markdown ---
const out = [];
out.push("# Reporte de duplicacion de codigo (client / server / shared)");
out.push("");
out.push(`Raiz analizada: \`${repoRoot}\` · archivos .ts/.tsx escaneados: ${files.length}`);
out.push("");

out.push("## 🔴 Duplicacion cross-area");
out.push("");
out.push(
  "Mismo identificador declarado en 2+ raices. Viola la regla de la constitution (75-77): " +
    "los contratos compartidos se definen una sola vez en `shared/` y se importan; ninguna raiz los redefine.",
);
out.push("");
if (crossArea.length === 0) {
  out.push("_Sin hallazgos._");
} else {
  for (const { name, sites } of crossArea) {
    out.push(`- **\`${name}\`** declarado en ${sites.length} lugares:`);
    for (const s of sites) {
      out.push(`  - \`${s.kind}\` en ${s.file}:${s.line}${s.exported ? "" : " (no exportado)"}`);
    }
  }
}
out.push("");

out.push("## 🟡 En shared/ pero usado en una sola raiz");
out.push("");
out.push(
  "Exportados desde `shared/` que solo consume client/ **o** server/ (no ambos). " +
    "Candidatos a mover a esa raiz — salvo que formen parte de una dependencia/herencia interna de `shared/` " +
    "(columna `intra-shared`), en cuyo caso conviene dejarlos juntos para no fragmentar el modulo.",
);
out.push("");
if (moveCandidates.length === 0) {
  out.push("_Sin hallazgos._");
} else {
  for (const s of moveCandidates) {
    const target = s.consumers[0];
    const note = s.intraShared
      ? ` ⚠️ tiene dependencias intra-shared — evaluar si conviene mantenerlo en \`shared/\``
      : ` → mover a \`${target}/\``;
    out.push(`- **\`${s.name}\`** (${s.sharedSites.map((x) => `${x.file}:${x.line}`).join(", ")}) — solo usado en **${target}/**.${note}`);
  }
}
out.push("");

out.push("## ⚪ En shared/ sin uso en client/ ni server/");
out.push("");
out.push("Exportados desde `shared/` que no se referencian fuera de `shared/`. Posible codigo muerto o uso indirecto no detectado por el escaneo textual — verificar a mano.");
out.push("");
if (orphanShared.length === 0) {
  out.push("_Sin hallazgos._");
} else {
  for (const s of orphanShared) {
    out.push(`- **\`${s.name}\`** (${s.sharedSites.map((x) => `${x.file}:${x.line}`).join(", ")})${s.intraShared ? " — usado solo dentro de shared/" : ""}`);
  }
}
out.push("");

console.log(out.join("\n"));
