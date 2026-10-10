# HorecaSO Print Agent (Epson — Camino 2)

Opcional. El TPV intenta `http://127.0.0.1:9173/print` y si no hay agente usa `window.print` (driver Windows).

```bash
cd tools/print_agent
pip install -r requirements.txt
python print_agent.py
```

Comprobar: abrir `http://127.0.0.1:9173/health` → `{"status":"ok"}`.

Sin `HORECASO_PRINTER` solo simula (log). Con Epson USB ajusta vendor/product en `print_agent.py`.

Guía completa: [docs/CHECKLIST_EPSON_PRINT.md](../../docs/CHECKLIST_EPSON_PRINT.md).
