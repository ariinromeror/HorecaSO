/**
 * Renderiza ReportesFiscal y falla si el título/descripción contiene "Verifactu".
 * Uso: node scripts/assert_reportes_fiscal_sin_verifactu.mjs
 */
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({
  root,
  logLevel: "error",
  server: { middlewareMode: true },
  appType: "custom",
  resolve: {
    alias: {
      // Evita cargar axios/env al solo comprobar el copy de la pantalla.
      "/src/services/api.js": join(root, "scripts/stubs/api_fiscal_stub.js"),
      "../../../services/api": join(root, "scripts/stubs/api_fiscal_stub.js"),
    },
  },
});

try {
  const mod = await server.ssrLoadModule(
    "/src/pages/reportes/components/ReportesFiscal.jsx"
  );
  const ReportesFiscal = mod.default;
  const html = renderToStaticMarkup(createElement(ReportesFiscal));

  // El párrafo introductorio es el "título" descriptivo de la pantalla (L33–36).
  const introMatch = html.match(/<p class="text-\[15px\][^"]*"[^>]*>([\s\S]*?)<\/p>/);
  assert.ok(introMatch, "No se encontró el párrafo de título/descripción");
  const intro = introMatch[1].replace(/\s+/g, " ").trim();

  assert.ok(
    !/verifactu/i.test(intro),
    'El título de ReportesFiscal no debe contener "Verifactu". Texto:\n' + intro
  );
  console.log("OK ReportesFiscal sin Verifactu en el título:", intro);
} finally {
  await server.close();
}
