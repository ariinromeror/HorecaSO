# Checklist Epson / impresión térmica (Paso 0)

Objetivo: comanda y ticket salen en papel en el PC del bar.

## Camino 1 — Driver Windows + navegador (por defecto)

1. Instala el driver Epson (TM-T20 / T88 / etc.) en Windows.
2. En **Impresoras**, deja la Epson como predeterminada (o elige en el diálogo de impresión).
3. En el TPV: **Imprimir comanda** / **Imprimir ticket**.
4. Si no hay Print Agent, el navegador abre el diálogo de impresión (ancho ~80 mm en CSS).
5. Las **notas de línea** (ej. «sin azúcar, sacarina») deben verse en papel bajo el producto.

## Camino 2 — Print Agent local (opcional, ESC/POS)

```bash
cd tools/print_agent
pip install -r requirements.txt
python print_agent.py
```

- Escucha `http://127.0.0.1:9173` (`/health`, `/print`).
- El TPV intenta el agente primero (~800 ms); si no responde, usa Camino 1.
- Sin `HORECASO_PRINTER` solo simula (log). Con USB Epson, ajusta vendor/product en `print_agent.py`.

## Criterio de hecho

- [ ] Café con nota «sin azúcar / sacarina» sale en comanda.
- [ ] Ticket de cobro legible (total + líneas).
- [ ] Reimpresión desde cobro funciona sin recargar la página.
