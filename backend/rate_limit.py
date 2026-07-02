"""
Instancia compartida de SlowAPI Limiter.

Se define en un módulo propio (en vez de en `main.py`) para que los routers
puedan importar `limiter` y usar `@limiter.limit(...)` sin crear un import
circular con la app principal.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
