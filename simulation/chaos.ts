/**
 * Galactic Emporium — Chaos Monkey
 *
 * Fires bad requests to stress-test error handling:
 *   - Non-existent product IDs
 *   - Empty / malformed checkouts
 *   - Wrong HTTP methods
 *   - Massive quantities
 *
 * Usage:
 *   npx tsx chaos.ts            # steady chaos (default)
 *   npx tsx chaos.ts --burst    # high-volume spike
 */

const BASE = process.env.API_URL ?? 'http://localhost:4008'

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const rand  = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pick  = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)]

let reqCount = 0
let errCount = 0

async function request(method: string, path: string, body?: unknown): Promise<{ status: number; data: any }> {
  reqCount++
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) errCount++
    return { status: res.status, data }
  } catch (e) {
    errCount++
    return { status: 0, data: {} }
  }
}

const get  = (path: string)               => request('GET',    path)
const post = (path: string, body: unknown) => request('POST',  path, body)
const del  = (path: string)               => request('DELETE', path)

function log(userId: string, action: string) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}] [CHAOS MONKEY  ] ${userId.padEnd(22)} ${action}`)
}

// ── Product IDs (fetched once at startup) ─────────────────────────────────────
let PRODUCT_IDS: string[] = []

async function loadProductIds() {
  const res = await fetch(`${BASE}/api/products`)
  const data = await res.json().catch(() => ({}))
  PRODUCT_IDS = (data.products ?? []).map((p: any) => p.id)
  console.log(`Loaded ${PRODUCT_IDS.length} product IDs.`)
}

// ── Chaos session ─────────────────────────────────────────────────────────────
async function runChaosMonkey(sessionId: number) {
  const userId = `chaos-${sessionId}-${Date.now().toString(36)}`
  log(userId, 'session started — brace yourself')

  const chaos: Array<() => Promise<any>> = [
    // Non-existent product
    () => get('/api/products/p999'),
    () => get('/api/products/not-a-real-id'),
    // Empty checkout
    () => post('/api/orders', { userId: `nobody-${Date.now()}` }),
    // Add product that doesn't exist
    () => post(`/api/cart/${userId}/items`, { productId: 'p_fake_9999', qty: 1 }),
    // Missing body fields
    () => post('/api/orders', {}),
    () => post(`/api/cart/${userId}/items`, {}),
    // Wrong HTTP method
    () => del('/api/products'),
    // Massive qty
    () => post(`/api/cart/${userId}/items`, { productId: pick(PRODUCT_IDS), qty: 99999 }),
  ]

  const steps = rand(3, 6)
  for (let i = 0; i < steps; i++) {
    const action = pick(chaos)
    const { status } = await action()
    log(userId, `fired bad request → HTTP ${status}`)
    await sleep(rand(200, 800))
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
async function main() {
  const burst = process.argv.includes('--burst')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Galactic Emporium — Chaos Monkey')
  console.log(`  Target: ${BASE}`)
  console.log(`  Mode:   ${burst ? 'BURST (high volume)' : 'STEADY (normal chaos)'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  await loadProductIds()

  let sessionId = 0

  setInterval(() => {
    console.log(`\n[stats] requests: ${reqCount}  errors: ${errCount}  error-rate: ${reqCount ? ((errCount / reqCount) * 100).toFixed(1) : 0}%\n`)
  }, 15_000)

  while (true) {
    const concurrency = burst ? rand(8, 15) : rand(2, 4)
    const sessions    = Array.from({ length: concurrency }, (_, i) => runChaosMonkey(sessionId + i))
    sessionId += concurrency

    await Promise.all(sessions)

    const delay = burst ? rand(200, 800) : rand(3000, 7000)
    await sleep(delay)
  }
}

main().catch(console.error)
