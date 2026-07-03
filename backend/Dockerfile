# syntax=docker/dockerfile:1
# HorecaSO backend — imagen de producción (Fase 6 del PRD de hardening).
# Coherente con render.yaml: mismo comando de arranque (gunicorn + uvicorn worker).

# ---------------------------------------------------------------------------
# Stage 1 — builder: compila dependencias en un venv aislado.
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /build

# gcc/libffi/libpq-dev necesarios para compilar asyncpg, bcrypt y Pillow.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libffi-dev \
        libjpeg-dev \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# Stage 2 — runtime: imagen final mínima, sin herramientas de compilación.
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

# Librerías de sistema en tiempo de ejecución (sin los -dev de compilación).
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        libjpeg62-turbo \
        zlib1g \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1000 app \
    && useradd --uid 1000 --gid app --shell /bin/bash --create-home app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY --chown=app:app . .

USER app

EXPOSE 8000

# Health check propio de Docker además del healthCheckPath de Render.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/health', timeout=3).status == 200 else 1)"

CMD ["gunicorn", "main:app", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "120"]
