"""
Genera hashes bcrypt para usuarios de prueba.

Las contraseñas NO se guardan en el repositorio. Para cada usuario se usa la
variable de entorno indicada; si no existe, se genera una contraseña aleatoria.

Uso (PowerShell):
    $env:HORECASO_PWD_SUPERADMIN = "..."   # opcional
    python scripts/generate_test_hashes.py
"""

import os
import secrets

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

usuarios = [
    ("superadmin@horecaso.com", "HORECASO_PWD_SUPERADMIN"),
    ("admin@prueba.com",        "HORECASO_PWD_ADMIN"),
    ("director@prueba.com",     "HORECASO_PWD_DIRECTOR"),
    ("jefesala@prueba.com",     "HORECASO_PWD_JEFESALA"),
    ("camarero@prueba.com",     "HORECASO_PWD_CAMARERO"),
    ("cocina@prueba.com",       "HORECASO_PWD_COCINA"),
    ("barra@prueba.com",        "HORECASO_PWD_BARRA"),
]

print("=" * 60)
print("Hashes generados — copiar al SQL")
print("=" * 60)
for email, env_var in usuarios:
    password = (os.getenv(env_var) or "").strip()
    generada = not password
    if generada:
        password = secrets.token_urlsafe(16)
    hashed = pwd_context.hash(password)
    print(f"\nEmail:    {email}")
    if generada:
        print(f"Password: {password}  (aleatoria; no se volverá a mostrar)")
    else:
        print(f"Password: (tomada de {env_var})")
    print(f"Hash:     {hashed}")
print("\n" + "=" * 60)
