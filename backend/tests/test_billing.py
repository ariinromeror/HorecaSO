"""
Tests de integración para Stripe Billing (Fase 11 del PRD).

No se hacen llamadas de red reales a Stripe: se monkeypatchea el SDK
(`stripe.Customer.create`, `stripe.checkout.Session.create`,
`stripe.billing_portal.Session.create`, `stripe.Webhook.construct_event`)
para poder verificar la lógica de negocio (creación/reutilización de
customer, idempotencia de webhooks, transición de `subscription_status`)
sin depender de una cuenta Stripe real ni de credenciales.
"""

import json

import stripe

from config import settings
from tests.conftest import crear_tenant, crear_usuario, make_token


def _configurar_stripe_test(monkeypatch):
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_dummy")
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_dummy")
    monkeypatch.setattr(settings, "STRIPE_PRICE_BASICO", "price_basico_123")
    monkeypatch.setattr(settings, "STRIPE_PRICE_PROFESIONAL", "price_profesional_123")


class _FakeStripeObject(dict):
    """Los objetos de la librería stripe soportan tanto `obj['x']` como `obj.x`."""

    def __getattr__(self, item):
        try:
            return self[item]
        except KeyError as e:
            raise AttributeError(item) from e


def _fake_event(event_id: str, event_type: str, data_object: dict) -> _FakeStripeObject:
    return _FakeStripeObject(
        id=event_id,
        type=event_type,
        data=_FakeStripeObject(object=_FakeStripeObject(**data_object)),
    )


# --- checkout-session ---------------------------------------------------


async def test_checkout_session_crea_customer_y_devuelve_url(client, db, monkeypatch):
    _configurar_stripe_test(monkeypatch)
    tenant_id = await crear_tenant(db)
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="admin")
    token = make_token(user_id, "admin", tenant_id)

    monkeypatch.setattr(
        stripe.Customer, "create", lambda **kwargs: {"id": "cus_nuevo_123"}
    )
    monkeypatch.setattr(
        stripe.checkout.Session,
        "create",
        lambda **kwargs: {"url": "https://checkout.stripe.com/session_abc"},
    )

    resp = await client.post(
        "/api/billing/checkout-session",
        json={"plan": "basico"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json() == {"checkout_url": "https://checkout.stripe.com/session_abc"}

    row = await db.fetchrow("SELECT stripe_customer_id FROM tenants WHERE id = $1", tenant_id)
    assert row["stripe_customer_id"] == "cus_nuevo_123"


async def test_checkout_session_reutiliza_customer_existente(client, db, monkeypatch):
    _configurar_stripe_test(monkeypatch)
    tenant_id = await crear_tenant(db)
    await db.execute(
        "UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2", "cus_ya_existe", tenant_id
    )
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="director")
    token = make_token(user_id, "director", tenant_id)

    llamadas_customer_create = []
    monkeypatch.setattr(
        stripe.Customer,
        "create",
        lambda **kwargs: llamadas_customer_create.append(kwargs) or {"id": "no-debe-usarse"},
    )
    monkeypatch.setattr(
        stripe.checkout.Session,
        "create",
        lambda **kwargs: {"url": "https://checkout.stripe.com/session_xyz"},
    )

    resp = await client.post(
        "/api/billing/checkout-session",
        json={"plan": "basico"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert llamadas_customer_create == []  # no se crea un customer nuevo


async def test_checkout_session_plan_sin_price_configurado_devuelve_400(client, db, monkeypatch):
    _configurar_stripe_test(monkeypatch)
    tenant_id = await crear_tenant(db)
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="admin")
    token = make_token(user_id, "admin", tenant_id)

    resp = await client.post(
        "/api/billing/checkout-session",
        json={"plan": "enterprise"},  # STRIPE_PRICE_ENTERPRISE no configurado en el test
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400


async def test_checkout_session_prohibido_para_rol_operativo(client, db, monkeypatch):
    _configurar_stripe_test(monkeypatch)
    tenant_id = await crear_tenant(db)
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="camarero")
    token = make_token(user_id, "camarero", tenant_id)

    resp = await client.post(
        "/api/billing/checkout-session",
        json={"plan": "basico"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


# --- portal-session -------------------------------------------------------


async def test_portal_session_sin_customer_devuelve_400(client, db, monkeypatch):
    _configurar_stripe_test(monkeypatch)
    tenant_id = await crear_tenant(db)
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="admin")
    token = make_token(user_id, "admin", tenant_id)

    resp = await client.post(
        "/api/billing/portal-session",
        json={},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400


async def test_portal_session_devuelve_url(client, db, monkeypatch):
    _configurar_stripe_test(monkeypatch)
    tenant_id = await crear_tenant(db)
    await db.execute(
        "UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2", "cus_con_sub", tenant_id
    )
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="admin")
    token = make_token(user_id, "admin", tenant_id)

    monkeypatch.setattr(
        stripe.billing_portal.Session,
        "create",
        lambda **kwargs: {"url": "https://billing.stripe.com/portal_abc"},
    )

    resp = await client.post(
        "/api/billing/portal-session",
        json={},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json() == {"portal_url": "https://billing.stripe.com/portal_abc"}


# --- webhook ---------------------------------------------------------------


async def test_webhook_sin_cabecera_firma_devuelve_400(client, monkeypatch):
    _configurar_stripe_test(monkeypatch)
    resp = await client.post("/api/billing/webhook", content=b"{}")
    assert resp.status_code == 400


async def test_webhook_firma_invalida_devuelve_400(client, monkeypatch):
    _configurar_stripe_test(monkeypatch)

    def _raise_firma_invalida(payload, sig_header, secret):
        raise stripe.error.SignatureVerificationError("firma inválida", sig_header)

    monkeypatch.setattr(stripe.Webhook, "construct_event", _raise_firma_invalida)

    resp = await client.post(
        "/api/billing/webhook",
        content=b"{}",
        headers={"stripe-signature": "t=123,v1=firma_falsa"},
    )
    assert resp.status_code == 400


async def test_webhook_checkout_y_subscription_updated_deja_tenant_activo(client, db, monkeypatch):
    _configurar_stripe_test(monkeypatch)
    tenant_id = await crear_tenant(db)
    await db.execute(
        "UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2", "cus_flujo_completo", tenant_id
    )

    eventos = [
        _fake_event(
            "evt_checkout_1",
            "checkout.session.completed",
            {"customer": "cus_flujo_completo", "subscription": "sub_123"},
        ),
        _fake_event(
            "evt_sub_updated_1",
            "customer.subscription.updated",
            {
                "id": "sub_123",
                "customer": "cus_flujo_completo",
                "status": "active",
                "current_period_end": 1900000000,
                "items": {"data": [{"price": {"id": "price_profesional_123"}}]},
            },
        ),
    ]

    for evt in eventos:
        monkeypatch.setattr(stripe.Webhook, "construct_event", lambda *a, _e=evt, **k: _e)
        resp = await client.post(
            "/api/billing/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=123,v1=firma_valida"},
        )
        assert resp.status_code == 200

    row = await db.fetchrow(
        "SELECT subscription_status, stripe_subscription_id, plan_price_id FROM tenants WHERE id = $1",
        tenant_id,
    )
    assert row["subscription_status"] == "active"
    assert row["stripe_subscription_id"] == "sub_123"
    assert row["plan_price_id"] == "price_profesional_123"


async def test_webhook_invoice_payment_failed_marca_past_due(client, db, monkeypatch):
    _configurar_stripe_test(monkeypatch)
    tenant_id = await crear_tenant(db)
    await db.execute(
        "UPDATE tenants SET stripe_customer_id = $1, subscription_status = 'active' WHERE id = $2",
        "cus_impago",
        tenant_id,
    )

    evt = _fake_event(
        "evt_invoice_failed_1",
        "invoice.payment_failed",
        {"customer": "cus_impago"},
    )
    monkeypatch.setattr(stripe.Webhook, "construct_event", lambda *a, **k: evt)

    resp = await client.post(
        "/api/billing/webhook",
        content=b"{}",
        headers={"stripe-signature": "t=123,v1=firma_valida"},
    )
    assert resp.status_code == 200

    row = await db.fetchrow("SELECT subscription_status FROM tenants WHERE id = $1", tenant_id)
    assert row["subscription_status"] == "past_due"


async def test_webhook_subscription_deleted_marca_canceled(client, db, monkeypatch):
    _configurar_stripe_test(monkeypatch)
    tenant_id = await crear_tenant(db)
    await db.execute(
        "UPDATE tenants SET stripe_customer_id = $1, subscription_status = 'past_due' WHERE id = $2",
        "cus_cancela",
        tenant_id,
    )

    evt = _fake_event(
        "evt_sub_deleted_1",
        "customer.subscription.deleted",
        {"id": "sub_999", "customer": "cus_cancela"},
    )
    monkeypatch.setattr(stripe.Webhook, "construct_event", lambda *a, **k: evt)

    resp = await client.post(
        "/api/billing/webhook",
        content=b"{}",
        headers={"stripe-signature": "t=123,v1=firma_valida"},
    )
    assert resp.status_code == 200

    row = await db.fetchrow("SELECT subscription_status FROM tenants WHERE id = $1", tenant_id)
    assert row["subscription_status"] == "canceled"


async def test_webhook_evento_duplicado_no_duplica_efectos(client, db, monkeypatch):
    _configurar_stripe_test(monkeypatch)
    tenant_id = await crear_tenant(db)
    await db.execute(
        "UPDATE tenants SET stripe_customer_id = $1, subscription_status = 'active' WHERE id = $2",
        "cus_dup",
        tenant_id,
    )

    evt = _fake_event(
        "evt_repetido_1",
        "invoice.payment_failed",
        {"customer": "cus_dup"},
    )
    monkeypatch.setattr(stripe.Webhook, "construct_event", lambda *a, **k: evt)

    for i in range(2):
        resp = await client.post(
            "/api/billing/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=123,v1=firma_valida"},
        )
        assert resp.status_code == 200
        if i == 1:
            assert resp.json().get("duplicate") is True

    count = await db.fetchval(
        "SELECT count(*) FROM billing_events WHERE stripe_event_id = $1", "evt_repetido_1"
    )
    assert count == 1


# --- require_active_subscription (enforcement de acceso) -------------------


async def test_tenant_canceled_pierde_acceso_a_endpoints_protegidos(client, db):
    tenant_id = await crear_tenant(db)
    await db.execute(
        "UPDATE tenants SET subscription_status = 'canceled' WHERE id = $1", tenant_id
    )
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="admin")
    token = make_token(user_id, "admin", tenant_id)

    resp = await client.get(
        "/api/verifactu/registros", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 402


async def test_tenant_past_due_fuera_de_gracia_pierde_acceso(client, db):
    tenant_id = await crear_tenant(db)
    await db.execute(
        """
        UPDATE tenants
        SET subscription_status = 'past_due',
            current_period_end = now() - interval '30 days'
        WHERE id = $1
        """,
        tenant_id,
    )
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="admin")
    token = make_token(user_id, "admin", tenant_id)

    resp = await client.get(
        "/api/verifactu/registros", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 402


async def test_tenant_past_due_dentro_de_gracia_mantiene_acceso(client, db):
    tenant_id = await crear_tenant(db)
    await db.execute(
        """
        UPDATE tenants
        SET subscription_status = 'past_due',
            current_period_end = now() - interval '1 day'
        WHERE id = $1
        """,
        tenant_id,
    )
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="admin")
    token = make_token(user_id, "admin", tenant_id)

    resp = await client.get(
        "/api/verifactu/registros", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200


async def test_tenant_activo_mantiene_acceso(client, db):
    tenant_id = await crear_tenant(db)
    await db.execute(
        "UPDATE tenants SET subscription_status = 'active' WHERE id = $1", tenant_id
    )
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="admin")
    token = make_token(user_id, "admin", tenant_id)

    resp = await client.get(
        "/api/verifactu/registros", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200


async def test_tenant_sin_subscription_status_mantiene_acceso_grandfathered(client, db):
    """Tenants creados antes de Fase 11 (subscription_status NULL) no se bloquean."""
    tenant_id = await crear_tenant(db)
    user_id, _ = await crear_usuario(db, tenant_id, None, rol="admin")
    token = make_token(user_id, "admin", tenant_id)

    resp = await client.get(
        "/api/verifactu/registros", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200


async def test_superadmin_nunca_se_bloquea_por_suscripcion(client, db):
    user_id, _ = await crear_usuario(db, None, None, rol="superadmin")
    token = make_token(user_id, "superadmin", None)

    resp = await client.get(
        "/api/superadmin/tenants", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200


async def test_webhook_y_auth_login_no_requieren_suscripcion_activa(client, db):
    """billing_router y auth_router están excluidos de require_active_subscription."""
    tenant_id = await crear_tenant(db)
    await db.execute(
        "UPDATE tenants SET subscription_status = 'canceled' WHERE id = $1", tenant_id
    )
    user_id, password = await crear_usuario(
        db, tenant_id, None, rol="admin", email="bloqueado@test.com"
    )

    resp = await client.post(
        "/api/auth/login", json={"email": "bloqueado@test.com", "password": password}
    )
    assert resp.status_code == 200  # login sigue funcionando aunque el tenant esté canceled
