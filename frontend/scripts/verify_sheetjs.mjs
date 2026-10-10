/**
 * Comprueba que xlsx es SheetJS 0.20.x del CDN oficial y que escribir/leer
 * un libro sigue funcionando (plantilla de ingredientes).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const pkg = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../node_modules/xlsx/package.json"),
    "utf8",
  ),
);

if (!String(pkg.version).startsWith("0.20.")) {
  console.error("xlsx no es 0.20.x:", pkg.version);
  process.exit(1);
}

const aoa = [
  ["nombre", "sku", "cantidad", "merma", "unidad"],
  ["Azúcar", "", 0.05, 0, "kg"],
];
const ws = XLSX.utils.aoa_to_sheet(aoa);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Ingredientes");
const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
const leido = XLSX.read(buf, { type: "buffer" });
const filas = XLSX.utils.sheet_to_json(leido.Sheets.Ingredientes, { header: 1 });
if (filas[1][0] !== "Azúcar") {
  console.error("No se pudo releer la plantilla");
  process.exit(1);
}
console.log("OK SheetJS", pkg.version, "escribir/leer xlsx");
