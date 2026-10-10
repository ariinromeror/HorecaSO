/**
 * sobreHorecaSO.js: sin "Verifactu hash" ni rutas/tablas inventadas.
 * Uso: node scripts/assert_sobre_horecaso_rutas_reales.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const content = readFileSync(
  join(root, "src/content/sobreHorecaSO.js"),
  "utf8"
);
const appJsx = readFileSync(join(root, "src/App.jsx"), "utf8");

const appPaths = new Set(
  [...appJsx.matchAll(/path=["']([^"']+)["']/g)].map((m) => m[1])
);

assert.ok(
  !/verifactu\s*hash|hash\s*verifactu/i.test(content),
  'sobreHorecaSO.js no debe mencionar "Verifactu hash"'
);

// «escandallos» en copy de inventario es término de UI, no la tabla inventada.
const inventadas = [
  "fiscal/verifactu.py",
  "ia_vision.py",
  "stock_engine.py",
  "productos_ingredientes",
  "lotes_stock",
  "facturas_emitidas",
  "turnos_fichajes",
];
const hits = inventadas.filter((s) =>
  content.toLowerCase().includes(s.toLowerCase())
);
// Tabla inventada «escandallos» solo si aparece en la lista de tablasBD.
const tablasBlocks = [...content.matchAll(/tablasBD:\s*\[\s*'([^']*)'/g)].map(
  (m) => m[1]
);
if (tablasBlocks.some((t) => /\bescandallos\b/i.test(t))) {
  hits.push("escandallos (como tabla inventada)");
}
assert.equal(
  hits.length,
  0,
  "Contenido inventado aún presente:\n" + hits.join("\n")
);

// Si el copy cita rutas de App (path="/…"), deben existir en App.jsx.
const citedAppPaths = [
  ...content.matchAll(/["'`](\/[a-zA-Z0-9_/\-]+)["'`]/g),
]
  .map((m) => m[1])
  .filter((p) => p.startsWith("/") && !p.includes("."));
const missing = [...new Set(citedAppPaths)].filter((p) => !appPaths.has(p));
assert.equal(
  missing.length,
  0,
  "Rutas citadas que no están en App.jsx:\n" + missing.join("\n")
);

console.log("OK sobreHorecaSO.js sin hash inventado ni rutas/tablas ficticias");
