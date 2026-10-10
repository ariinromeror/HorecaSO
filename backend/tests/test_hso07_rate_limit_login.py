"""
HSO-07 — Login sin límite de intentos.
Límites: 5/minuto por IP + email y 30/minuto por IP. La IP es la última
entrada de X-Forwarded-For (la añade el proxy de la plataforma).
"""

LOGIN = "/api/auth/login"


def _login(client, email, ip=None, xff=None):
    headers = {}
    if xff is not None:
        headers["X-Forwarded-For"] = xff
    elif ip is not None:
        headers["X-Forwarded-For"] = ip
    return client.post(LOGIN, json={"email": email, "password": "incorrecta"}, headers=headers)


async def test_sexto_intento_misma_cuenta_429(client, seed):
    email = seed.a.usuarios["admin"].email
    for _ in range(5):
        assert (await _login(client, email, ip="203.0.113.10")).status_code == 401

    r = await _login(client, email, ip="203.0.113.10")

    assert r.status_code == 429, r.text
    assert "Demasiados intentos" in r.json()["detail"]


async def test_429_tambien_con_password_correcta(client, seed):
    user = seed.a.usuarios["admin"]
    for _ in range(5):
        await _login(client, user.email, ip="203.0.113.11")

    r = await client.post(
        LOGIN, json={"email": user.email, "password": seed.password},
        headers={"X-Forwarded-For": "203.0.113.11"},
    )
    assert r.status_code == 429, r.text


async def test_turno_completo_desde_misma_ip_no_bloquea(client, seed):
    """Varios empleados del mismo local (misma IP pública) entrando a la vez."""
    for i in range(10):
        r = await _login(client, f"empleado{i}@tenanta.horecaso-test.com", ip="203.0.113.20")
        assert r.status_code == 401, (i, r.text)


async def test_barrido_de_cuentas_desde_una_ip_429(client, seed):
    for i in range(30):
        assert (await _login(client, f"x{i}@x.com", ip="203.0.113.30")).status_code == 401

    r = await _login(client, "x30@x.com", ip="203.0.113.30")
    assert r.status_code == 429, r.text


async def test_x_forwarded_for_falsificado_no_salta_el_limite(client, seed):
    """El cliente puede escribir entradas a la izquierda; el proxy añade la real al final."""
    email = seed.a.usuarios["admin"].email
    for i in range(5):
        await _login(client, email, xff=f"10.0.0.{i}, 203.0.113.40")

    r = await _login(client, email, xff="10.9.9.9, 203.0.113.40")
    assert r.status_code == 429, r.text


async def test_limite_independiente_por_ip_real(client, seed):
    email = seed.a.usuarios["admin"].email
    for _ in range(5):
        await _login(client, email, ip="203.0.113.50")

    assert (await _login(client, email, ip="203.0.113.51")).status_code == 401
