-- ============================================================
-- MIGRATION Fase 11 — Stripe Billing (suscripciones SaaS por tenant)
-- Columnas de suscripción en `tenants` + tabla `billing_events` para
-- auditoría/idempotencia de webhooks de Stripe. Ver PRD.md Fase 11.
-- Idempotente: seguro reejecutar (IF NOT EXISTS en todo).
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_price_id TEXT;

-- NULL = tenant "grandfathered" (nunca ha pasado por Stripe todavía, p. ej.
-- tenants creados antes de esta fase o de prueba) — require_active_subscription()
-- trata NULL como acceso permitido, ver auth/dependencies.py.
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_subscription_status_check;

ALTER TABLE tenants
  ADD CONSTRAINT tenants_subscription_status_check CHECK (
    subscription_status IS NULL OR subscription_status IN (
      'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id
  ON tenants (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants (id) ON DELETE SET NULL,
  stripe_event_id TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL,
  payload_json JSONB,
  procesado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_tenant_procesado_at
  ON billing_events (tenant_id, procesado_at DESC);
