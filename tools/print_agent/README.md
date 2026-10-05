# HorecaSO Print Agent (Epson — Camino 2)

Opcional. El TPV intenta `http://127.0.0.1:9173/print` y si no hay agente usa `window.print` (driver Windows).

```bash
cd tools/print_agent
pip install fastapi uvicorn
# opcional ESC/POS: pip install python-escpos
python print_agent.py
```

Sin `HORECASO_PRINTER` solo simula (log). Con Epson USB ajusta vendor/product en el script.
