-- Login domain por tenant: luisana@{email_slug}.com
-- Ejecutar en Supabase (HorecaSO)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_slug TEXT;

UPDATE tenants
SET email_slug = NULLIF(
  TRIM(BOTH '-' FROM regexp_replace(
    regexp_replace(
      lower(
        translate(
          coalesce(nombre, 'tenant'),
          'áàäâãåéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
          'aaaaaaeeeeiiiiooooouuuuncaaaaaaeeeeiiiiooooouuuunc'
        )
      ),
      '[^a-z0-9]+', '-', 'g'
    ),
    '-+', '-', 'g'
  )),
  ''
)
WHERE email_slug IS NULL OR btrim(email_slug) = '';

UPDATE tenants t
SET email_slug = t.email_slug || '-' || left(replace(t.id::text, '-', ''), 8)
WHERE t.email_slug IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM tenants o
    WHERE o.email_slug = t.email_slug AND o.id <> t.id
  );

UPDATE tenants SET email_slug = 'tenant-' || left(replace(id::text, '-', ''), 8)
WHERE email_slug IS NULL OR btrim(email_slug) = '';

ALTER TABLE tenants ALTER COLUMN email_slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_email_slug_uidx ON tenants (email_slug);
