/**
 * Renderiza TicketPrintView (ticket cliente) y falla si aparece "Verifactu".
 * Uso: node scripts/assert_ticket_print_sin_verifactu.mjs
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
});

try {
  const mod = await server.ssrLoadModule(
    "/src/pages/tpv/components/TicketPrintView.jsx"
  );
  const TicketPrintView = mod.default;
  const html = renderToStaticMarkup(
    createElement(TicketPrintView, {
      type: "ticket",
      mesaLabel: "1",
      lineas: [{ id: "l1", nombre: "Café", cantidad: 1, subtotal: 1.5 }],
      total: 1.5,
      qrUrl:
        "https://www.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=B12345678&numserie=SERIE-2026-000001&fecha=10-10-2026&importe=1.50",
      numeroSerie: "SERIE-2026-000001",
      tenantNombre: "Bar Demo",
      tenantPrint: {
        nombre: "Bar Demo",
        nif: "B12345678",
        direccion: "Calle Mayor 1",
      },
    })
  );

  assert.ok(
    !/verifactu/i.test(html),
    'El ticket cliente no debe contener "Verifactu". HTML:\n' + html
  );
  console.log("OK TicketPrintView ticket cliente sin Verifactu");
} finally {
  await server.close();
}
