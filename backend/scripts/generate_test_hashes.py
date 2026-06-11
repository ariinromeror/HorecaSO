from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

usuarios = [
    ("superadmin@horecaso.com", "SuperAdmin2024!"),
    ("admin@prueba.com",        "Admin1234!"),
    ("director@prueba.com",     "Director1234!"),
    ("jefesala@prueba.com",     "JefeSala1234!"),
    ("camarero@prueba.com",     "Camarero1234!"),
    ("cocina@prueba.com",       "Cocina1234!"),
    ("barra@prueba.com",        "Barra1234!"),
]

print("=" * 60)
print("Hashes generados — copiar al SQL")
print("=" * 60)
for email, password in usuarios:
    hashed = pwd_context.hash(password)
    print(f"\nEmail:    {email}")
    print(f"Password: {password}")
    print(f"Hash:     {hashed}")
print("\n" + "=" * 60)
