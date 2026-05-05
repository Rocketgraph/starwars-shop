import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import pino from 'pino'
import { v4 as uuidv4 } from 'uuid'

// ── Logger (pino → OTEL collector + stdout) ───────────────────────────────────
const transport = pino.transport({
  targets: [
    { target: 'pino-opentelemetry-transport', level: 'info', options: {} },
    { target: 'pino/file', level: 'info', options: { destination: 1 } }, // stdout
  ],
})
const log = pino({ level: 'info' }, transport)

// ── Catalog ──────────────────────────────────────────────────────────────────
interface Product {
  id: string
  name: string
  price: number
  category: 'weapons' | 'droids' | 'armor' | 'ships' | 'force' | 'collectibles'
  stock: number
  description: string
  image: string
  rating: number
}

const PRODUCTS: Product[] = [
  { id: 'p1',  name: "Luke's Lightsaber",          price: 299.99,   category: 'weapons',      stock: 10, rating: 4.9, image: '⚔️',  description: "Skywalker's iconic blue blade. Constructed with a Adegan crystal." },
  { id: 'p2',  name: "Darth Vader's Lightsaber",   price: 349.99,   category: 'weapons',      stock: 8,  rating: 4.8, image: '🔴',  description: "Crimson-bladed terror. The galaxy bows before it." },
  { id: 'p3',  name: "Yoda's Lightsaber",           price: 499.99,   category: 'weapons',      stock: 3,  rating: 5.0, image: '💚',  description: "Shoto-style. Small but the Force flows strong through it." },
  { id: 'p4',  name: "Darksaber",                   price: 899.99,   category: 'weapons',      stock: 1,  rating: 5.0, image: '🖤',  description: "Unique black-bladed saber. Leads Mandalore." },
  { id: 'p5',  name: "R2-D2 Astromech Droid",       price: 1299.99,  category: 'droids',       stock: 4,  rating: 4.9, image: '🤖',  description: "Loyal, resourceful, and will save your life at least twice." },
  { id: 'p6',  name: "C-3PO Protocol Droid",        price: 999.99,   category: 'droids',       stock: 6,  rating: 4.5, image: '🤖',  description: "Fluent in over 6 million forms of communication. Worries in all of them." },
  { id: 'p7',  name: "BB-8 Unit",                   price: 799.99,   category: 'droids',       stock: 9,  rating: 4.8, image: '⚽',  description: "Spherical, loyal, fast. The Resistance's most optimistic asset." },
  { id: 'p8',  name: "IG-11 Bounty Hunter Droid",   price: 1599.99,  category: 'droids',       stock: 2,  rating: 4.7, image: '🦾',  description: "Nurse, hunter, and self-destruct unit. Reprogrammable." },
  { id: 'p9',  name: "Mandalorian Helmet",           price: 599.99,   category: 'armor',        stock: 15, rating: 5.0, image: '⛑️',  description: "Beskar. This is the way." },
  { id: 'p10', name: "Stormtrooper Armor Set",       price: 449.99,   category: 'armor',        stock: 20, rating: 3.2, image: '🪖',  description: "Standard Imperial issue. Warning: accuracy not included." },
  { id: 'p11', name: "Clone Trooper Phase II Armor", price: 699.99,   category: 'armor',        stock: 7,  rating: 4.6, image: '🛡️',  description: "Republic-era armor. Customizable colors and markings." },
  { id: 'p12', name: "Millennium Falcon",            price: 95000.00, category: 'ships',        stock: 1,  rating: 4.9, image: '🚀',  description: "She may not look like much but she's got it where it counts." },
  { id: 'p13', name: "X-Wing Starfighter",           price: 45000.00, category: 'ships',        stock: 3,  rating: 4.8, image: '✈️',  description: "S-foils in attack position. Standard Rebel Alliance fighter." },
  { id: 'p14', name: "TIE Fighter",                  price: 22000.00, category: 'ships',        stock: 12, rating: 3.8, image: '🛸',  description: "Twin Ion Engine. Loud, fast, no hyperdrive. Ask your supervisor for escort." },
  { id: 'p15', name: "Kyber Crystal",                price: 89.99,    category: 'force',        stock: 40, rating: 4.7, image: '💎',  description: "Pure Force energy. The heart of every lightsaber." },
  { id: 'p16', name: "Jedi Holocron",                price: 249.99,   category: 'force',        stock: 5,  rating: 4.9, image: '🔮',  description: "Ancient repository of Jedi knowledge. Requires Force sensitivity." },
  { id: 'p17', name: "Darth Bane's Sith Holocron",  price: 399.99,   category: 'force',        stock: 2,  rating: 4.6, image: '⬛',  description: "Knowledge of the Rule of Two. Handle with care." },
  { id: 'p18', name: "Millennium Falcon LEGO Set",   price: 849.99,   category: 'collectibles', stock: 25, rating: 4.9, image: '🧱',  description: "7,541 pieces. Approximately 12 parsecs of assembly time." },
  { id: 'p19', name: "Death Star Blueprint",         price: 9999.99,  category: 'collectibles', stock: 1,  rating: 2.0, image: '💀',  description: "Original stolen plans. Has one known flaw. Priced accordingly." },
  { id: 'p20', name: "Han Solo in Carbonite Statue", price: 1499.99,  category: 'collectibles', stock: 3,  rating: 4.5, image: '🗿',  description: "Life-size. Jabba-approved. Very decorative." },
]

// ── In-memory state ───────────────────────────────────────────────────────────
interface CartItem { productId: string; qty: number }
interface Order {
  id: string
  userId: string
  items: Array<{ product: Product; qty: number }>
  total: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered'
  createdAt: string
}

interface Coupon {
  code: string
  percentage: number
  active: boolean
}

const carts  = new Map<string, CartItem[]>()
const orders: Order[] = []
const coupons = new Map<string, Coupon>([
  ['JEDI10', { code: 'JEDI10', percentage: 10, active: true }],
  ['SITH20', { code: 'SITH20', percentage: 20, active: true }],
  ['FORCE30', { code: 'FORCE30', percentage: 30, active: false }],
])

// ── App ───────────────────────────────────────────────────────────────────────
const app  = express()
const PORT = process.env.PORT ?? 4000

app.use(cors())
app.use(express.json())

// Request logger middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  log.info({ method: req.method, path: req.path, query: req.query }, 'incoming request')
  next()
})

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'starwars-shop', timestamp: new Date().toISOString() })
})

// ── Products ──────────────────────────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  const { category, search, sort } = req.query as Record<string, string>

  let results = [...PRODUCTS]

  if (category) {
    results = results.filter(p => p.category === category)
    log.info({ category, count: results.length }, 'filtered products by category')
  }

  if (search) {
    const q = search.toLowerCase()
    results = results.filter(p =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    )
    log.info({ search, count: results.length }, 'searched products')
  }

  if (sort === 'price_asc')  results.sort((a, b) => a.price - b.price)
  if (sort === 'price_desc') results.sort((a, b) => b.price - a.price)
  if (sort === 'rating')     results.sort((a, b) => b.rating - a.rating)

  res.json({ products: results, total: results.length })
})

app.get('/api/products/:id', (req, res) => {
  const product = PRODUCTS.find(p => p.id === req.params.id)
  if (!product) {
    log.warn({ productId: req.params.id }, 'product not found')
    return res.status(404).json({ error: 'Product not found', productId: req.params.id })
  }
  log.info({ productId: product.id, name: product.name }, 'product viewed')
  res.json(product)
})

// ── Cart ──────────────────────────────────────────────────────────────────────
app.get('/api/cart/:userId', (req, res) => {
  const { userId } = req.params
  const items = carts.get(userId) ?? []
  const enriched = items.map(item => {
    const product = PRODUCTS.find(p => p.id === item.productId)
    return { product, qty: item.qty }
  }).filter(i => i.product)

  const total = enriched.reduce((sum, i) => sum + i.product!.price * i.qty, 0)
  res.json({ userId, items: enriched, total: +total.toFixed(2), itemCount: items.length })
})

app.post('/api/cart/:userId/items', (req, res) => {
  const { userId } = req.params
  const { productId, qty = 1 } = req.body

  if (!productId) {
    log.warn({ userId }, 'add to cart missing productId')
    return res.status(400).json({ error: 'productId is required' })
  }

  const product = PRODUCTS.find(p => p.id === productId)
  if (!product) {
    log.warn({ userId, productId }, 'add to cart: product not found')
    return res.status(404).json({ error: 'Product not found' })
  }

  if (product.stock < qty) {
    log.warn({ userId, productId, stock: product.stock, requested: qty }, 'insufficient stock')
    return res.status(409).json({ error: 'Insufficient stock', available: product.stock })
  }

  const cart = carts.get(userId) ?? []
  const existing = cart.find(i => i.productId === productId)
  if (existing) {
    existing.qty += qty
  } else {
    cart.push({ productId, qty })
  }
  carts.set(userId, cart)

  log.info({ userId, productId, name: product.name, qty, cartSize: cart.length }, 'item added to cart')
  res.json({ success: true, cart: cart.length })
})

app.delete('/api/cart/:userId/items/:productId', (req, res) => {
  const { userId, productId } = req.params
  const cart = carts.get(userId) ?? []
  const filtered = cart.filter(i => i.productId !== productId)
  carts.set(userId, filtered)
  log.info({ userId, productId }, 'item removed from cart')
  res.json({ success: true })
})

app.delete('/api/cart/:userId', (req, res) => {
  carts.delete(req.params.userId)
  res.json({ success: true })
})

// ── Coupons ───────────────────────────────────────────────────────────────────
app.get('/api/coupons/:code', (req, res) => {
  const { code } = req.params
  const coupon = coupons.get(code.toUpperCase())
  if (!coupon) {
    log.warn({ code }, 'coupon not found')
    return res.status(404).json({ error: 'Coupon not found', code })
  }
  if (!coupon.active) {
    log.warn({ code }, 'coupon is inactive')
    return res.status(410).json({ error: 'Coupon is no longer active', code })
  }
  log.info({ code, percentage: coupon.percentage }, 'coupon retrieved')
  res.json({ code: coupon.code, percentage: coupon.percentage })
})

app.post('/api/cart/:userId/apply-coupon', (req, res) => {
  const { userId } = req.params
  const { code } = req.body

  if (!code) {
    return res.status(400).json({ error: 'coupon code is required' })
  }

  const coupon = coupons.get(code.toUpperCase())
  if (!coupon) {
    log.warn({ userId, code }, 'apply coupon: coupon not found')
    return res.status(404).json({ error: 'Coupon not found', code })
  }

  if (!coupon.active) {
    log.warn({ userId, code }, 'apply coupon: coupon inactive')
    return res.status(410).json({ error: 'Coupon is no longer active', code })
  }

  const items = carts.get(userId) ?? []
  if (items.length === 0) {
    log.warn({ userId }, 'apply coupon: cart is empty')
    return res.status(400).json({ error: 'Cart is empty' })
  }

  const enriched = items.map(item => {
    const product = PRODUCTS.find(p => p.id === item.productId)
    return { product, qty: item.qty }
  }).filter(i => i.product)

  const subtotal = enriched.reduce((sum, i) => sum + i.product!.price * i.qty, 0)
  const discount = +(subtotal * coupon.percentage / 100).toFixed(2)
  const total = +(subtotal - discount).toFixed(2)

  log.info({ userId, code, percentage: coupon.percentage, subtotal, discount, total }, 'coupon applied')
  res.json({ subtotal, discount, total, couponCode: coupon.code, percentage: coupon.percentage })
})

// ── Orders ────────────────────────────────────────────────────────────────────
app.post('/api/orders', (req, res) => {
  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  const cart = carts.get(userId) ?? []
  if (cart.length === 0) {
    log.warn({ userId }, 'checkout attempted with empty cart')
    return res.status(400).json({ error: 'Cart is empty' })
  }

  const items: Array<{ product: Product; qty: number }> = []
  for (const item of cart) {
    const product = PRODUCTS.find(p => p.id === item.productId)
    if (!product) {
      log.warn({ userId, productId: item.productId }, 'checkout: product in cart not found, skipping')
      continue
    }
    product.stock = Math.max(0, product.stock - item.qty)
    items.push({ product, qty: item.qty })
  }

  if (items.length === 0) {
    log.warn({ userId }, 'checkout: no valid products in cart')
    return res.status(400).json({ error: 'No valid products in cart' })
  }

  const total = items.reduce((sum, i) => sum + i.product.price * i.qty, 0)
  const order: Order = {
    id:        `ord-${uuidv4().slice(0, 8)}`,
    userId,
    items,
    total:     +total.toFixed(2),
    status:    'confirmed',
    createdAt: new Date().toISOString(),
  }

  orders.push(order)
  carts.delete(userId)   // clear cart after checkout

  log.info({
    orderId: order.id,
    userId,
    total: order.total,
    itemCount: items.length,
    items: items.map(i => ({ name: i.product.name, qty: i.qty, price: i.product.price })),
  }, 'order placed')

  res.status(201).json(order)
})

// Note: detail route must come BEFORE the :userId param route to avoid shadowing
app.get('/api/orders/detail/:orderId', (req, res) => {
  const { orderId } = req.params
  const order = orders.find(o => o.id === orderId)
  if (!order) {
    log.warn({ orderId }, 'order not found')
    return res.status(404).json({ error: 'Order not found', orderId })
  }
  res.json(order)
})

app.get('/api/orders/:userId', (req, res) => {
  const userOrders = orders.filter(o => o.userId === req.params.userId)
  res.json({ orders: userOrders, total: userOrders.length })
})

app.get('/api/orders', (_req, res) => {
  res.json({ orders, total: orders.length })
})

// ── Auth (fake — just issues a userId) ───────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username } = req.body
  if (!username) return res.status(400).json({ error: 'username required' })
  const userId = `user-${username.toLowerCase().replace(/\s+/g, '-')}`
  log.info({ userId, username }, 'user logged in')
  res.json({ userId, username, token: `tok-${uuidv4()}` })
})

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  log.warn({ method: req.method, path: req.path }, '404 not found')
  res.status(404).json({ error: 'Not found' })
})

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log.error({ err: err.message, stack: err.stack }, 'unhandled error')
  res.status(500).json({ error: 'Internal server error', message: err.message })
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  log.info({ port: PORT, service: 'starwars-shop' }, 'server started')
})
