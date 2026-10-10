"""
Pide una contraseña por consola (sin eco) y muestra su hash bcrypt.

La contraseña no se pasa por argumento ni variable de entorno, así no queda
en el historial de la terminal.

Uso:
    cd backend
    python scripts/hash_password.py
"""

import getpass
import sys

from passlib.context import CryptContext

MIN_LEN = 14

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

password = getpass.getpass("Nueva contraseña: ")
if len(password) < MIN_LEN:
    sys.exit(f"Mínimo {MIN_LEN} caracteres.")
if getpass.getpass("Repetir contraseña: ") != password:
    sys.exit("Las contraseñas no coinciden.")

hashed = pwd_context.hash(password)
if not pwd_context.verify(password, hashed):
    sys.exit("Error verificando el hash generado.")

print(hashed)
