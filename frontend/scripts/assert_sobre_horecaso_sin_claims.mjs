/**
 * PROJECT_INFO.sobre (ES/EN) no debe afirmar cumplimiento ni Verifactu.
 * Uso: node scripts/assert_sobre_horecaso_sin_claims.mjs
 *
 * Alcance paso 3: solo la sección «sobre» (no rutas del README → paso 4).
 */
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

function collectStrings(value, out = []) {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
  return out;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({
  root,
  logLevel: "error",
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const mod = await server.ssrLoadModule("/src/content/sobreHorecaSO.js");
  const { PROJECT_INFO } = mod;
  const textos = [
    ...collectStrings(PROJECT_INFO.es.sobre),
    ...collectStrings(PROJECT_INFO.en.sobre),
  ];
  const unidos = textos.join("\n");

  const prohibidos = [
    [/cumplimiento/i, "cumplimiento"],
    [/compliance/i, "compliance"],
    [/verifactu/i, "Verifactu"],
  ];

  const hallados = [];
  for (const [re, label] of prohibidos) {
    if (re.test(unidos)) {
      const hit = textos.find((t) => re.test(t));
      hallados.push(`${label} → ${hit}`);
    }
  }

  assert.equal(
    hallados.length,
    0,
    "sobreHorecaSO.js (sección sobre) no debe contener cumplimiento/compliance/Verifactu:\n" +
      hallados.join("\n")
  );
  console.log("OK sobreHorecaSO.js sección sobre sin claims prohibidos");
} finally {
  await server.close();
}
