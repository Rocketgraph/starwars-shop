/**
 * Galactic Emporium — Traffic Simulation
 *
 * Runs concurrent user sessions with realistic behaviour:
 *   - Buyer         → browses → adds multiple items → checks out
 *   - Window Shopper → browses many categories, never buys
 *   - Bargain Hunter → searches cheapest items, buys one
 *   - Chaos Monkey  → hits bad endpoints, invalid IDs, empty checkouts
 *
 * Usage:
 *   npx tsx simulate.ts            # steady traffic (default)
 *   npx tsx simulate.ts --burst    # high-volume spike
 */

const BASE = process.env.API_URL ?? 'http://localhost:4000'

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

const get    = (path: string)              => request('GET',    path)
const post   = (path: string, body: unknown) => request('POST', path, body)
const del    = (path: string)              => request('DELETE', path)

function log(persona: string, userId: string, action: string) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}] [${persona.padEnd(14)}] ${userId.padEnd(22)} ${action}`)
}

// ── Product catalog (fetched once at startup) ─────────────────────────────────
let ALL_PRODUCTS: any[] = []
let PRODUCT_IDS: string[] = []

async function loadCatalog() {
  const { data } = await get('/api/products')
  ALL_PRODUCTS  = data.products ?? []
  PRODUCT_IDS   = ALL_PRODUCTS.map((p: any) => p.id)
  console.log(`Loaded ${ALL_PRODUCTS.length} products from catalog.`)
}

// ── Personas ──────────────────────────────────────────────────────────────────

/** Buyer: browses categories → adds 2-4 items → checks out */
async function runBuyer(userId: string) {
  log('BUYER', userId, 'session started')

  const categories = ['weapons', 'droids', 'armor', 'force', 'ships', 'collectibles']

  // Browse 1-2 categories
  for (let i = 0; i < rand(1, 2); i++) {
    const cat = pick(categories)
    const { data } = await get(`/api/products?category=${cat}`)
    log('BUYER', userId, `browsed ${cat} (${data.products?.length ?? 0} items)`)
    await sleep(rand(800, 2000))

    // View a random product in detail
    const products: any[] = data.products ?? []
    if (products.length > 0) {
      const product = pick(products)
      await get(`/api/products/${product.id}`)
      log('BUYER', userId, `viewed "${product.name}"`)
      await sleep(rand(500, 1500))
    }
  }

  // Add 2-4 items to cart
  const toAdd = rand(2, 4)
  for (let i = 0; i < toAdd; i++) {
    const productId = pick(PRODUCT_IDS)
    const { status, data } = await post(`/api/cart/${userId}/items`, { productId, qty: 1 })
    if (status === 200 || status === 201) {
      const name = ALL_PRODUCTS.find((p: any) => p.id === productId)?.name ?? productId
      log('BUYER', userId, `added "${name}" to cart`)
    } else if (status === 409) {
      log('BUYER', userId, `stock conflict on ${productId} — skipping`)
    }
    await sleep(rand(400, 1200))
  }

  // View cart
  const { data: cart } = await get(`/api/cart/${userId}`)
  log('BUYER', userId, `cart has ${cart.itemCount ?? 0} items, total: ${cart.total ?? 0} cr`)
  await sleep(rand(1000, 3000))

  // Checkout
  const { status, data: order } = await post('/api/orders', { userId })
  if (status === 201) {
    log('BUYER', userId, `✓ ORDER PLACED: ${order.id} (${order.total} cr)`)
  } else {
    log('BUYER', userId, `✗ checkout failed: ${order.error}`)
  }
}

/** Window Shopper: browses heavily, never buys */
async function runWindowShopper(userId: string) {
  log('WINDOW SHOPPER', userId, 'session started')

  const routes = [
    '/api/products',
    '/api/products?category=weapons',
    '/api/products?category=droids',
    '/api/products?category=ships',
    '/api/products?sort=price_asc',
    '/api/products?sort=rating',
    '/api/products?search=lightsaber',
    '/api/products?search=droid',
  ]

  const steps = rand(4, 8)
  for (let i = 0; i < steps; i++) {
    const route = pick(routes)
    const { data } = await get(route)
    const count = data.products?.length ?? 0
    log('WINDOW SHOPPER', userId, `GET ${route} → ${count} results`)

    // Occasionally view a product detail
    if (Math.random() < 0.5 && data.products?.length > 0) {
      const p = pick(data.products)
      await get(`/api/products/${p.id}`)
      log('WINDOW SHOPPER', userId, `viewed "${p.name}" — did not add to cart`)
    }

    await sleep(rand(1500, 4000))
  }

  log('WINDOW SHOPPER', userId, 'left without buying')
}

/** Bargain Hunter: searches for cheapest item and buys exactly one */
async function runBargainHunter(userId: string) {
  log('BARGAIN HUNTER', userId, 'session started')

  const { data } = await get('/api/products?sort=price_asc')
  const products: any[] = data.products ?? []
  log('BARGAIN HUNTER', userId, `scanning ${products.length} items by price`)
  await sleep(rand(500, 1500))

  // Pick one of the 5 cheapest in-stock items
  const affordable = products.filter((p: any) => p.stock > 0).slice(0, 5)
  if (affordable.length === 0) {
    log('BARGAIN HUNTER', userId, 'nothing affordable — leaving')
    return
  }

  const target = pick(affordable)
  await get(`/api/products/${target.id}`)
  log('BARGAIN HUNTER', userId, `chose "${target.name}" at ${target.price} cr`)
  await sleep(rand(800, 2000))

  await post(`/api/cart/${userId}/items`, { productId: target.id, qty: 1 })
  log('BARGAIN HUNTER', userId, 'added to cart')
  await sleep(rand(300, 800))

  const { status, data: order } = await post('/api/orders', { userId })
  if (status === 201) {
    log('BARGAIN HUNTER', userId, `✓ quick buy: ${order.id} — ${order.total} cr`)
  } else {
    log('BARGAIN HUNTER', userId, `✗ order failed: ${order.error}`)
  }
}

/** Chaos Monkey: fires bad requests to generate errors and 404s */
async function runChaosMonkey(userId: string) {
  log('CHAOS MONKEY', userId, 'session started — brace yourself')

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
    log('CHAOS MONKEY', userId, `fired bad request → HTTP ${status}`)
    await sleep(rand(200, 800))
  }
}

/** Heavy buyer: bulk-adds items, intended for load testing */
async function runHeavyBuyer(userId: string) {
  log('HEAVY BUYER', userId, 'session started — buying everything')

  // Add 8-12 items
  const count = rand(8, 12)
  for (let i = 0; i < count; i++) {
    const productId = PRODUCT_IDS[i % PRODUCT_IDS.length]
    await post(`/api/cart/${userId}/items`, { productId, qty: 1 })
    await sleep(rand(100, 300))
  }

  const { data: cart } = await get(`/api/cart/${userId}`)
  log('HEAVY BUYER', userId, `cart: ${cart.itemCount} items, ${cart.total} cr`)

  const { status, data: order } = await post('/api/orders', { userId })
  if (status === 201) {
    log('HEAVY BUYER', userId, `✓ bulk order: ${order.id} (${order.total} cr, ${order.items?.length} items)`)
  }
}

// ── Session runner ────────────────────────────────────────────────────────────
type Persona = 'buyer' | 'windowShopper' | 'bargainHunter' | 'chaos' | 'heavy'

const PERSONA_WEIGHTS: Persona[] = [
  'buyer', 'buyer', 'buyer',           // 30% buyer
  'windowShopper', 'windowShopper',    // 20% window shopper
  'bargainHunter', 'bargainHunter',    // 20% bargain hunter
  'heavy', 'heavy',                    // 20% heavy buyer
  'chaos',                             // 10% chaos monkey
]

async function runSession(sessionId: number) {
  const persona = pick(PERSONA_WEIGHTS)
  const userId  = `sim-${persona.slice(0, 3)}-${sessionId}-${Date.now().toString(36)}`

  try {
    switch (persona) {
      case 'buyer':         await runBuyer(userId);         break
      case 'windowShopper': await runWindowShopper(userId); break
      case 'bargainHunter': await runBargainHunter(userId); break
      case 'chaos':         await runChaosMonkey(userId);   break
      case 'heavy':         await runHeavyBuyer(userId);    break
    }
  } catch (e) {
    console.error(`[session ${sessionId}] uncaught error:`, e)
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
async function main() {
  const burst = process.argv.includes('--burst')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Galactic Emporium — Traffic Simulator')
  console.log(`  Target: ${BASE}`)
  console.log(`  Mode:   ${burst ? 'BURST (high volume)' : 'STEADY (normal traffic)'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  await loadCatalog()

  let sessionId = 0

  // Stats reporter
  setInterval(() => {
    console.log(`\n[stats] requests: ${reqCount}  errors: ${errCount}  error-rate: ${reqCount ? ((errCount / reqCount) * 100).toFixed(1) : 0}%\n`)
  }, 15_000)

  while (true) {
    const concurrency = burst ? rand(8, 15) : rand(2, 5)
    const sessions    = Array.from({ length: concurrency }, (_, i) => runSession(sessionId + i))
    sessionId += concurrency

    await Promise.all(sessions)

    // Cool-down between waves
    const delay = burst ? rand(200, 800) : rand(2000, 6000)
    await sleep(delay)
  }
}

main().catch(console.error)
