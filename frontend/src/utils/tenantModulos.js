/**
 * Visibilidad de módulos del tenant — alineado con backend require_modulo:
 * - Sin clave modulo en el ítem → el caller decide (sidebar: true).
 * - modulos null / no objeto / {} → legacy: permitir (tenants antiguos).
 * - Objeto con claves → activo salvo modulos[key] === false.
 */
export function isModuloActivo(modulos, moduloKey) {
  if (!moduloKey) return true
  if (modulos == null || typeof modulos !== 'object' || Array.isArray(modulos)) {
    return true
  }
  if (Object.keys(modulos).length === 0) return true
  return modulos[moduloKey] !== false
}
