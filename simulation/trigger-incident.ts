/**
 * trigger-incident.ts — realistic load simulation
 *
 * Simulates normal user behaviour that happens to hit two latent bugs.
 * No special modes, no injected errors — just users browsing and checking out.
 *
 * Usage:  npx tsx trigger-incident.ts
 */

const BASE        = process.env.API_URL ?? 'http://localhost:4008'
const DURATION_MS = 3 * 60 * 1000

// Mid-range products ($500–$999) — the discount tier bug fires for these totals
const MID_RANGE_IDS = ['p9', 'p11', 'p4', 'p7']  // Mandalorian Helmet, Clone Armor, Darksaber, BB-8
const CHEAP_IDS     = ['p15', 'p16', 'p10']        // Kyber Crystal, Holocron, Stormtrooper Armor

const FIRST_NAMES = ['luke', 'leia', 'han', 'rey', 'finn', 'poe', 'jyn', 'cassian',
                     'ahsoka', 'ezra', 'sabine', 'kanan', 'hera', 'zeb', 'cara', 'boba']
const LAST_NAMES  = ['skywalker', 'organa', 'solo', 'dameron', 'erso', 'andor',
                     'tano', 'bridger', 'wren', 'jarrus', 'syndulla', 'dune', 'fett']

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const rand  = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pick  = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)]
const ts    = () => new Date().toISOString().slice(11, 19)
const userId = () => `${pick(FIRST_NAMES)}.${pick(LAST_NAMES)}.${rand(10, 99)}`

let totalRequests = 0
let total500s     = 0
let successOrders = 0

async function req(method: string, path: string, body?: unknown) {
  totalRequests++
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (res.status >= 500) total500s++
    return { status: res.status, data }
  } catch {
    total500s++
    return { status: 0, data: {} }
  }
}

function log(msg: string) {
  console.log(`[${ts()}] ${msg}`)
}

async function assertHealthy() {
  const { status } = await req('GET', '/health')
  if (status !== 200) {
    console.error(`Backend not reachable at ${BASE}`)
    process.exit(1)
  }
  log('backend healthy')
}

// Users browsing and buying cheap items — no errors
async function casualShopper(endAt: number) {
  while (Date.now() < endAt) {
    const uid = userId()
    await req('GET', `/api/products?category=${pick(['weapons', 'force', 'armor'])}`)
    await req('GET', `/api/orders/${uid}`)   // new user loading profile → bug 2
    const productId = pick(CHEAP_IDS)
    await req('POST', `/api/cart/${uid}/items`, { productId, qty: 1 })
    const r = await req('POST', '/api/orders', { userId: uid })
    if (r.status === 201) successOrders++
    await sleep(rand(1500, 4000))
  }
}

// Users buying mid-range items — hits discount tier bug
async function midRangeShopper(endAt: number) {
  while (Date.now() < endAt) {
    const uid       = userId()
    const productId = pick(MID_RANGE_IDS)
    await req('GET', `/api/products/${productId}`)
    await req('GET', `/api/orders/${uid}`)   // profile load → bug 2
    await req('POST', `/api/cart/${uid}/items`, { productId, qty: 1 })
    const r = await req('POST', '/api/orders', { userId: uid })
    log(`${uid} → checkout ${productId} → ${r.status}`)
    if (r.status === 201) successOrders++
    await sleep(rand(800, 2000))
  }
}

async function main() {
  log('starting simulation')
  await assertHealthy()

  const endAt = Date.now() + DURATION_MS
  log(`running for ${DURATION_MS / 1000}s...`)
  console.log()

  const statsInterval = setInterval(() => {
    const errRate = totalRequests > 0 ? ((total500s / totalRequests) * 100).toFixed(1) : '0.0'
    log(`requests=${totalRequests}  5xx=${total500s}  error_rate=${errRate}%  orders=${successOrders}`)
  }, 20_000)

  await Promise.all([
    casualShopper(endAt),
    casualShopper(endAt),
    casualShopper(endAt),
    midRangeShopper(endAt),
    midRangeShopper(endAt),
    midRangeShopper(endAt),
    midRangeShopper(endAt),
    midRangeShopper(endAt),
  ])

  clearInterval(statsInterval)

  const errRate = totalRequests > 0 ? ((total500s / totalRequests) * 100).toFixed(1) : '0'
  console.log()
  log(`done — ${totalRequests} requests, ${total500s} errors (${errRate}%), ${successOrders} successful orders`)
}

main().catch(console.error)
