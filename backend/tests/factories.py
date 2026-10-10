"""
Datos de prueba: dos tenants completos + superadmin.

Cada tenant (A y B) tiene:
  - outlet "Sala principal"
  - usuarios: admin, camarero, cocina (activos) y camarero_inactivo (activo=false)
  - mesas: 1 y 2 libres, 3 ocupada con ticket abierto
  - productos: "Menú del día" 12.50 (IVA 10, cocina) y "Caña" 2.50 (IVA 21, barra)
  - ticket abierto en la mesa 3: 2 x Menú + 2 x Caña = 30.00
"""

from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP

PRECIO_MENU = Decimal("12.50")
PRECIO_CANA = Decimal("2.50")


@dataclass(frozen=True)
class SeedUser:
    id: str
    email: str
    rol: str
    tenant_id: str | None
    outlet_id: str | None
    activo: bool = True


@dataclass
class SeedTenant:
    id: str
    slug: str
    nif: str
    outlet_id: str
    mesa_libre_id: str
    mesa_libre_2_id: str
    mesa_ocupada_id: str
    productos: dict[str, str]
    usuarios: dict[str, SeedUser]
    ticket_abierto_id: str
    ticket_abierto_total: Decimal
    ticket_abierto_lineas: list[str] = field(default_factory=list)


@dataclass
class SeedWorld:
    a: SeedTenant
    b: SeedTenant
    superadmin: SeedUser
    password: str


async def create_tenant(conn, slug: str, nombre: str, nif: str) -> str:
    return str(await conn.fetchval(
        """
        INSERT INTO tenants (nombre, nif, email_slug, plan, activo)
        VALUES ($1, $2, $3, 'profesional', true)
        RETURNING id
        """,
        nombre, nif, slug,
    ))


async def create_outlet(conn, tenant_id: str, nombre: str = "Sala principal") -> str:
    return str(await conn.fetchval(
        "INSERT INTO outlets (tenant_id, nombre, num_mesas) VALUES ($1, $2, 3) RETURNING id",
        tenant_id, nombre,
    ))


async def create_user(
    conn,
    *,
    email: str,
    rol: str,
    password_hash: str,
    tenant_id: str | None,
    outlet_id: str | None,
    activo: bool = True,
) -> SeedUser:
    user_id = await conn.fetchval(
        """
        INSERT INTO usuarios (tenant_id, outlet_id, nombre, email, password_hash, rol, activo)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
        """,
        tenant_id, outlet_id, f"Test {rol}", email, password_hash, rol, activo,
    )
    return SeedUser(str(user_id), email, rol, tenant_id, outlet_id, activo)


async def create_mesa(conn, outlet_id: str, numero: int, estado: str = "libre") -> str:
    return str(await conn.fetchval(
        "INSERT INTO mesas (outlet_id, numero, capacidad, estado, zona) "
        "VALUES ($1, $2, 4, $3, 'Sala') RETURNING id",
        outlet_id, numero, estado,
    ))


async def create_producto(
    conn,
    tenant_id: str,
    categoria_id: str,
    nombre: str,
    precio: Decimal,
    iva: Decimal,
    destino_kds: str,
) -> str:
    return str(await conn.fetchval(
        """
        INSERT INTO productos (tenant_id, categoria_id, nombre, precio, iva_porcentaje,
                               destino_kds, activo, es_bebida)
        VALUES ($1, $2, $3, $4, $5, $6, true, $7)
        RETURNING id
        """,
        tenant_id, categoria_id, nombre, precio, iva, destino_kds, destino_kds == "barra",
    ))


async def create_open_ticket(
    conn,
    *,
    outlet_id: str,
    mesa_id: str,
    camarero_id: str,
    lineas: list[tuple[str, int, Decimal]],
) -> tuple[str, Decimal, list[str]]:
    """Ticket 'abierto' con líneas (producto_id, cantidad, precio). Marca la mesa ocupada."""
    ticket_id = str(await conn.fetchval(
        "INSERT INTO tickets (outlet_id, mesa_id, camarero_id, estado, total) "
        "VALUES ($1, $2, $3, 'abierto', 0) RETURNING id",
        outlet_id, mesa_id, camarero_id,
    ))
    total = Decimal("0.00")
    linea_ids: list[str] = []
    for producto_id, cantidad, precio in lineas:
        subtotal = (precio * cantidad).quantize(Decimal("0.01"), ROUND_HALF_UP)
        total += subtotal
        linea_ids.append(str(await conn.fetchval(
            """
            INSERT INTO ticket_lineas (ticket_id, producto_id, cantidad, precio_unitario,
                                       subtotal, enviado_cocina, estado_cocina)
            VALUES ($1, $2, $3, $4, $5, true, 'pendiente')
            RETURNING id
            """,
            ticket_id, producto_id, cantidad, precio, subtotal,
        )))
    await conn.execute("UPDATE tickets SET total = $1 WHERE id = $2", total, ticket_id)
    await conn.execute("UPDATE mesas SET estado = 'ocupada' WHERE id = $1", mesa_id)
    return ticket_id, total, linea_ids


async def seed_tenant(conn, key: str, nif: str, password_hash: str) -> SeedTenant:
    slug = f"tenant{key}"
    domain = f"{slug}.horecaso-test.com"
    tenant_id = await create_tenant(conn, slug, f"Restaurante {key.upper()}", nif)
    outlet_id = await create_outlet(conn, tenant_id)

    usuarios = {}
    for rol in ("admin", "camarero", "cocina"):
        usuarios[rol] = await create_user(
            conn, email=f"{rol}@{domain}", rol=rol, password_hash=password_hash,
            tenant_id=tenant_id, outlet_id=outlet_id,
        )
    usuarios["camarero_inactivo"] = await create_user(
        conn, email=f"inactivo@{domain}", rol="camarero", password_hash=password_hash,
        tenant_id=tenant_id, outlet_id=outlet_id, activo=False,
    )

    categoria_id = str(await conn.fetchval(
        "INSERT INTO categorias_menu (tenant_id, nombre, orden) VALUES ($1, 'General', 1) RETURNING id",
        tenant_id,
    ))
    productos = {
        "menu": await create_producto(conn, tenant_id, categoria_id, "Menú del día",
                                      PRECIO_MENU, Decimal("10"), "cocina"),
        "cana": await create_producto(conn, tenant_id, categoria_id, "Caña",
                                      PRECIO_CANA, Decimal("21"), "barra"),
    }

    mesa_libre = await create_mesa(conn, outlet_id, 1)
    mesa_libre_2 = await create_mesa(conn, outlet_id, 2)
    mesa_ocupada = await create_mesa(conn, outlet_id, 3)
    ticket_id, total, linea_ids = await create_open_ticket(
        conn,
        outlet_id=outlet_id,
        mesa_id=mesa_ocupada,
        camarero_id=usuarios["camarero"].id,
        lineas=[(productos["menu"], 2, PRECIO_MENU), (productos["cana"], 2, PRECIO_CANA)],
    )

    return SeedTenant(
        id=tenant_id, slug=slug, nif=nif, outlet_id=outlet_id,
        mesa_libre_id=mesa_libre, mesa_libre_2_id=mesa_libre_2, mesa_ocupada_id=mesa_ocupada,
        productos=productos, usuarios=usuarios,
        ticket_abierto_id=ticket_id, ticket_abierto_total=total,
        ticket_abierto_lineas=linea_ids,
    )


async def seed_world(conn, password: str, password_hash: str) -> SeedWorld:
    a = await seed_tenant(conn, "a", "B11111111", password_hash)
    b = await seed_tenant(conn, "b", "B22222222", password_hash)
    superadmin = await create_user(
        conn, email="superadmin@horecaso-test.com", rol="superadmin",
        password_hash=password_hash, tenant_id=None, outlet_id=None,
    )
    return SeedWorld(a=a, b=b, superadmin=superadmin, password=password)
