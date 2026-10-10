/**
 * Credenciales demo: no en LoginPage.jsx ni en dist/ de producción.
 * Uso: node scripts/check_bundle_secrets.mjs [--build]
 * Con --build: ejecuta npm run build y vuelve a escanear dist/.
 */
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const doBuild = process.argv.includes('--build')

/** Cadenas de secretos / emails demo — no roles sueltos (camarero/cocina). */
const FORBIDDEN = [
  'SuperAdmin2024',
  'Admin1234',
  'admin123',
  'Test1234',
  'Camarero1234',
  'Cocina1234',
  '@prueba.com',
  '@test.com',
  '@horecaso.com',
]

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walkFiles(p, out)
    else out.push(p)
  }
  return out
}

function findHits(text, label) {
  const hits = []
  for (const needle of FORBIDDEN) {
    if (text.includes(needle)) hits.push(`${label}: "${needle}"`)
  }
  return hits
}

const loginPage = readFileSync(
  join(root, 'src/pages/LoginPage.jsx'),
  'utf8'
)
const sourceHits = findHits(loginPage, 'LoginPage.jsx')
assert.equal(
  sourceHits.length,
  0,
  'Credenciales demo aún en código fuente:\n' + sourceHits.join('\n')
)

if (doBuild) {
  execSync('npm run build', { cwd: root, stdio: 'inherit' })
}

const distDir = join(root, 'dist')
assert.ok(existsSync(distDir), 'dist/ no existe — ejecuta con --build o npm run build')

const distHits = []
for (const file of walkFiles(distDir)) {
  if (!/\.(js|html|css|json|txt|map|webmanifest)$/i.test(file)) continue
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  const rel = file.slice(root.length + 1)
  distHits.push(...findHits(text, rel))
}

assert.equal(
  distHits.length,
  0,
  'Credenciales demo en dist/:\n' + distHits.join('\n')
)

console.log('OK check_bundle_secrets: LoginPage + dist limpios')
