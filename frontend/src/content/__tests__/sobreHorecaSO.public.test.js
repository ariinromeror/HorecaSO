/**
 * Copy público del login (PROJECT_INFO): sin estructura interna.
 * Uso: node src/content/__tests__/sobreHorecaSO.public.test.js
 */
import assert from 'node:assert/strict'
import { PROJECT_INFO } from '../sobreHorecaSO.js'

function flattenVisible(value, out = []) {
  if (typeof value === 'string') {
    out.push(value)
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) flattenVisible(item, out)
    return out
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) flattenVisible(v, out)
  }
  return out
}

const tables = [
  'tenants',
  'usuarios',
  'productos',
  'tickets',
  'ticket_lineas',
  'ticket_pagos',
  'verifactu_registros',
  'lotes_inventario',
  'recetas',
  'turnos',
]

const forbiddenSubstrings = [
  '.py',
  '.jsx',
  '/api/',
  ':8000',
  'routers/',
  'services/',
  'auth/',
  'llama-',
  'Groq',
  'groq',
]

for (const lang of ['es', 'en']) {
  const text = flattenVisible(PROJECT_INFO[lang]).join('\n')

  for (const needle of forbiddenSubstrings) {
    assert.ok(
      !text.includes(needle),
      `[${lang}] no debe contener "${needle}"`
    )
  }

  for (const table of tables) {
    const re = new RegExp(`\\b${table}\\b`, 'i')
    assert.ok(!re.test(text), `[${lang}] no debe contener tabla "${table}"`)
  }

  if (lang === 'es') {
    assert.ok(
      /registro interno/i.test(text),
      '[es] debe mencionar registro interno'
    )
    assert.ok(/sin env[ií]o/i.test(text), '[es] debe mencionar sin envío')
  } else {
    assert.ok(
      /internal (sales )?ledger|internal sales/i.test(text),
      '[en] debe mencionar internal ledger / sales'
    )
    assert.ok(
      /not available|without.*AEAT|no AEAT/i.test(text),
      '[en] debe indicar que no hay envío AEAT'
    )
  }
}

console.log('OK sobreHorecaSO public copy (ES/EN)')
