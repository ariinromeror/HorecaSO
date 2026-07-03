"""
Router de facturación SaaS (Stripe Billing) — Fase 11 del PRD.

Cobra a los **tenants** (restaurantes clientes de HorecaSO) por su plan de
suscripción. Stripe gestiona el ciclo de vida completo (checkout, cobro
recurrente, impago, cancelación); este router solo:
  1. Crea sesiones de Checkout/Customer Portal (redirect a Stripe).
  2. Escucha el webhook de Stripe y sincroniza `tenants.subscription_status`.

Nunca se procesa un número de tarjeta en este backend — todo pasa por las
páginas alojadas de Stripe (PCI-DSS fuera de nuestro alcance).
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Literal, Optional
from uuid import UUID

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from auth.dependencies import require_roles
from config import settings
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/billing",
    tags=["Billing"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

# admin/director gestionan la facturación de su propio tenant; superadmin
# puede iniciar un checkout en nombre de un tenant (alta de cliente nuevo).
ROLES_BILLING_TENANT = ["admin", "director"]
PlanNombre = Literal["basico", "profesional", "premium", "enterprise"]


def _ensure_stripe_configured() -> None:
    if not settings.STRIPE_SECRET_KEY:
        logger.error("Stripe no configurado: falta STRIPE_SECRET_KEY")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Facturación no disponible: Stripe no configurado",
        )
    stripe.api_key = settings.STRIPE_SECRET_KEY


def _resolve_tenant_id(current_user: dict, body_tenant_id: Optional[UUID]) -> UUID:
    """Tenant objetivo de la operación: propio del token, salvo superadmin."""
    if current_user.get("role") == "superadmin":
        if not body_tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="tenant_id requerido cuando el rol es superadmin",
            )
        return body_tenant_id

    raw = current_user.get("negocio_id")
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sin tenant asignado en el token",
        )
    return UUID(str(raw))


def _tenant_row_public(r: Any) -> dict:
    return {
        "tenant_id": str(r["id"]),
        "plan": r["plan"],
        "plan_price_id": r.get("plan_price_id"),
        "subscription_status": r.get("subscription_status"),
        "current_period_end": r["current_period_end"].isoformat()
        if r.get("current_period_end")
        else None,
        "tiene_cliente_stripe": bool(r.get("stripe_customer_id")),
    }


class CheckoutSessionRequest(BaseModel):
    plan: PlanNombre
    tenant_id: Optional[UUID] = None


class PortalSessionRequest(BaseModel):
    tenant_id: Optional[UUID] = None


@router.get("/estado")
async def get_estado_suscripcion(
    current_user: dict = Depends(require_roles(ROLES_BILLING_TENANT)),
):
    """Plan y estado de suscripción del tenant del usuario autenticado."""
    tenant_id = _resolve_tenant_id(current_user, None)
    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, plan, plan_price_id, subscription_status,
                       current_period_end, stripe_customer_id
                FROM tenants
                WHERE id = $1
                """,
                tenant_id,
            )
    except Exception as e:
        logger.error("get_estado_suscripcion: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el estado de la suscripción",
        ) from e

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant no encontrado")

    return _tenant_row_public(row)


@router.post("/checkout-session")
async def crear_checkout_session(
    body: CheckoutSessionRequest,
    current_user: dict = Depends(require_roles(ROLES_BILLING_TENANT + ["superadmin"])),
):
    """
    Crea (si no existe) el Customer de Stripe del tenant y una
    `checkout.Session` en modo suscripción para el plan elegido.
    Devuelve la URL de redirección a la página de pago alojada por Stripe.
    """
    _ensure_stripe_configured()
    tenant_id = _resolve_tenant_id(current_user, body.tenant_id)

    price_id = settings.stripe_price_por_plan.get(body.plan)
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plan '{body.plan}' no tiene price_id de Stripe configurado",
        )

    try:
        async with get_db() as conn:
            trow = await conn.fetchrow(
                "SELECT id, nombre, email, stripe_customer_id FROM tenants WHERE id = $1",
                tenant_id,
            )
            if not trow:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant no encontrado")

            customer_id = trow["stripe_customer_id"]
            if not customer_id:
                customer = stripe.Customer.create(
                    name=trow["nombre"],
                    email=trow["email"] or None,
                    metadata={"tenant_id": str(tenant_id)},
                )
                customer_id = customer["id"]
                await conn.execute(
                    "UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2",
                    customer_id,
                    tenant_id,
                )

            session = stripe.checkout.Session.create(
                customer=customer_id,
                mode="subscription",
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=f"{settings.FRONTEND_URL}/facturacion?checkout=success",
                cancel_url=f"{settings.FRONTEND_URL}/facturacion?checkout=cancel",
                metadata={"tenant_id": str(tenant_id), "plan": body.plan},
            )
    except HTTPException:
        raise
    except stripe.error.StripeError as e:
        logger.error("crear_checkout_session (Stripe): %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error al comunicar con Stripe",
        ) from e
    except Exception as e:
        logger.error("crear_checkout_session: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        ) from e

    return {"checkout_url": session["url"]}


@router.post("/portal-session")
async def crear_portal_session(
    body: PortalSessionRequest,
    current_user: dict = Depends(require_roles(ROLES_BILLING_TENANT + ["superadmin"])),
):
    """
    Crea una `billing_portal.Session` de Stripe para que el tenant gestione
    su suscripción (tarjeta, facturas, cambio de plan, cancelación) sin UI
    propia. Requiere que el tenant ya tenga un Customer de Stripe (haber
    pasado al menos una vez por `checkout-session`).
    """
    _ensure_stripe_configured()
    tenant_id = _resolve_tenant_id(current_user, body.tenant_id)

    try:
        async with get_db() as conn:
            trow = await conn.fetchrow(
                "SELECT stripe_customer_id FROM tenants WHERE id = $1",
                tenant_id,
            )
            if not trow:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant no encontrado")
            if not trow["stripe_customer_id"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El tenant todavía no tiene una suscripción de Stripe",
                )

            portal = stripe.billing_portal.Session.create(
                customer=trow["stripe_customer_id"],
                return_url=f"{settings.FRONTEND_URL}/facturacion",
            )
    except HTTPException:
        raise
    except stripe.error.StripeError as e:
        logger.error("crear_portal_session (Stripe): %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error al comunicar con Stripe",
        ) from e
    except Exception as e:
        logger.error("crear_portal_session: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        ) from e

    return {"portal_url": portal["url"]}


def _extract_price_id(subscription_obj: dict) -> Optional[str]:
    items = (subscription_obj.get("items") or {}).get("data") or []
    if items:
        price = items[0].get("price") or {}
        return price.get("id")
    return None


def _epoch_to_datetime(epoch: Optional[int]) -> Optional[datetime]:
    if epoch is None:
        return None
    return datetime.fromtimestamp(epoch, tz=timezone.utc)


async def _tenant_id_por_customer(conn, customer_id: Optional[str]) -> Optional[UUID]:
    if not customer_id:
        return None
    row = await conn.fetchrow(
        "SELECT id FROM tenants WHERE stripe_customer_id = $1", customer_id
    )
    return row["id"] if row else None


async def _procesar_evento_stripe(conn, tipo: str, data_object: dict) -> None:
    """Aplica el efecto de negocio de un evento de Stripe ya deduplicado."""
    customer_id = data_object.get("customer")
    tenant_id = await _tenant_id_por_customer(conn, customer_id)
    if not tenant_id:
        logger.warning(
            "Webhook Stripe '%s': ningún tenant con stripe_customer_id=%s",
            tipo,
            customer_id,
        )
        return

    if tipo == "checkout.session.completed":
        subscription_id = data_object.get("subscription")
        if subscription_id:
            await conn.execute(
                "UPDATE tenants SET stripe_subscription_id = $1 WHERE id = $2",
                subscription_id,
                tenant_id,
            )
        return

    if tipo in ("customer.subscription.created", "customer.subscription.updated"):
        await conn.execute(
            """
            UPDATE tenants
            SET subscription_status = $1,
                stripe_subscription_id = $2,
                current_period_end = $3,
                plan_price_id = COALESCE($4, plan_price_id)
            WHERE id = $5
            """,
            data_object.get("status"),
            data_object.get("id"),
            _epoch_to_datetime(data_object.get("current_period_end")),
            _extract_price_id(data_object),
            tenant_id,
        )
        return

    if tipo == "customer.subscription.deleted":
        await conn.execute(
            "UPDATE tenants SET subscription_status = 'canceled' WHERE id = $1",
            tenant_id,
        )
        return

    if tipo == "invoice.paid":
        await conn.execute(
            """
            UPDATE tenants SET subscription_status = 'active'
            WHERE id = $1 AND subscription_status IS DISTINCT FROM 'canceled'
            """,
            tenant_id,
        )
        return

    if tipo == "invoice.payment_failed":
        await conn.execute(
            """
            UPDATE tenants SET subscription_status = 'past_due'
            WHERE id = $1 AND subscription_status IS DISTINCT FROM 'canceled'
            """,
            tenant_id,
        )
        return

    logger.info("Webhook Stripe: evento '%s' recibido sin handler específico", tipo)


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request):
    """
    Endpoint público (sin JWT) — la autenticidad se verifica con la firma
    `stripe-signature` + `STRIPE_WEBHOOK_SECRET`, nunca con un Bearer token.
    Idempotente: cada `stripe_event_id` se inserta una única vez en
    `billing_events` (UNIQUE + `ON CONFLICT DO NOTHING`); reenviar el mismo
    evento no duplica efectos.
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.error("Webhook Stripe recibido pero STRIPE_WEBHOOK_SECRET no configurado")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook no configurado",
        )

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not sig_header:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falta cabecera stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.warning("Webhook Stripe rechazado: firma/payload inválido (%s)", e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firma inválida") from e

    event_id = event["id"]
    event_type = event["type"]
    data_object = event["data"]["object"]

    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_por_customer(conn, data_object.get("customer"))
            inserted = await conn.fetchval(
                """
                INSERT INTO billing_events (tenant_id, stripe_event_id, tipo, payload_json)
                VALUES ($1, $2, $3, $4::jsonb)
                ON CONFLICT (stripe_event_id) DO NOTHING
                RETURNING id
                """,
                tenant_id,
                event_id,
                event_type,
                json.dumps(data_object, default=str),
            )
            if inserted is None:
                logger.info(
                    "Webhook Stripe %s (%s) ya procesado antes, ignorando", event_id, event_type
                )
                return {"received": True, "duplicate": True}

            await _procesar_evento_stripe(conn, event_type, data_object)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error procesando webhook Stripe %s: %s", event_type, e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno") from e

    return {"received": True}
