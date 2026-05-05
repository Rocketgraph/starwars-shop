import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import pino from 'pino'

const log = pino(
  { level: 'info' },
  pino.transport({
    targets: [
      { target: 'pino-opentelemetry-transport', level: 'info', options: {} },
      { target: 'pino/file', level: 'info', options: { destination: 1 } },
    ],
  })
)

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
  { id: 'p4',  name: "Darksaber",                   price: 899.99,   category: 'weapons',      stock: 500, rating: 5.0, image: '🖤',  description: "Unique black-bladed saber. Leads Mandalore." },
  { id: 'p5',  name: "R2-D2 Astromech Droid",       price: 1299.99,  category: 'droids',       stock: 4,  rating: 4.9, image: '🤖',  description: "Loyal, resourceful, and will save your life at least twice." },
  { id: 'p6',  name: "C-3PO Protocol Droid",        price: 999.99,   category: 'droids',       stock: 6,  rating: 4.5, image: '🤖',  description: "Fluent in over 6 million forms of communication. Worries in all of them." },
  { id: 'p7',  name: "BB-8 Unit",                   price: 799.99,   category: 'droids',       stock: 500, rating: 4.8, image: '⚽',  description: "Spherical, loyal, fast. The Resistance's most optimistic asset." },
  { id: 'p8',  name: "IG-11 Bounty Hunter Droid",   price: 1599.99,  category: 'droids',       stock: 2,  rating: 4.7, image: '🦾',  description: "Nurse, hunter, and self-destruct unit. Reprogrammable." },
  { id: 'p9',  name: "Mandalorian Helmet",           price: 599.99,   category: 'armor',        stock: 500, rating: 5.0, image: '⛑️',  description: "Beskar. This is the way." },
  { id: 'p10', name: "Stormtrooper Armor Set",       price: 449.99,   category: 'armor',        stock: 20, rating: 3.2, image: '🪖',  description: "Standard Imperial issue. Warning: accuracy not included." },
  { id: 'p11', name: "Clone Trooper Phase II Armor", price: 699.99,   category: 'armor',        stock: 500, rating: 4.6, image: '🛡️',  description: "Republic-era armor. Customizable colors and markings." },
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

// ── Loyalty discount tiers ────────────────────────────────────────────────────
const DISCOUNT_TIERS = [
  { threshold: 1000, percentage: 10 },
  { threshold: 2000, percentage: 15 },
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

const carts  = new Map<string, CartItem[]>()
const orders: Order[] = []

// ── App ───────────────────────────────────────────────────────────────────────
const app  = express()
const PORT = process.env.PORT ?? 4000

app.use(cors())
app.use(express.json())

// Request logger middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  log.info(`${req.method} ${req.path}`)
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
    log.info(`Filtered by category=${category}, got ${results.length} results`)
  }

  if (search) {
    const q = search.toLowerCase()
    results = results.filter(p =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    )
    log.info(`Search "${search}" returned ${results.length} products`)
  }

  if (sort === 'price_asc')  results.sort((a, b) => a.price - b.price)
  if (sort === 'price_desc') results.sort((a, b) => b.price - a.price)
  if (sort === 'rating')     results.sort((a, b) => b.rating - a.rating)

  res.json({ products: results, total: results.length })
})

app.get('/api/products/:id', (req, res) => {
  const product = PRODUCTS.find(p => p.id === req.params.id)
  if (!product) {
    log.warn(`Product not found: ${req.params.id}`)
    return res.status(404).json({ error: 'Product not found', productId: req.params.id })
  }
  log.info(`Product viewed: ${product.name} (${product.id})`)
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
    log.warn(`Add to cart failed for user ${userId}: missing productId`)
    return res.status(400).json({ error: 'productId is required' })
  }

  const product = PRODUCTS.find(p => p.id === productId)
  if (!product) {
    log.warn(`Add to cart failed for user ${userId}: product ${productId} not found`)
    return res.status(404).json({ error: 'Product not found' })
  }

  if (product.stock < qty) {
    log.warn(`Insufficient stock for ${product.name}: requested ${qty}, only ${product.stock} left`)
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

  log.info(`User ${userId} added ${qty}x ${product.name} to cart (cart size: ${cart.length})`)
  res.json({ success: true, cart: cart.length })
})

app.delete('/api/cart/:userId/items/:productId', (req, res) => {
  const { userId, productId } = req.params
  const cart = carts.get(userId) ?? []
  const filtered = cart.filter(i => i.productId !== productId)
  carts.set(userId, filtered)
  log.info(`User ${userId} removed ${productId} from cart`)
  res.json({ success: true })
})

app.delete('/api/cart/:userId', (req, res) => {
  carts.delete(req.params.userId)
  res.json({ success: true })
})

// ── Orders ────────────────────────────────────────────────────────────────────
app.post('/api/orders', (req, res) => {
  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  const cart = carts.get(userId) ?? []
  if (cart.length === 0) {
    log.warn(`Checkout failed for user ${userId}: cart is empty`)
    return res.status(400).json({ error: 'Cart is empty' })
  }

  // Validate all products exist and have sufficient stock before charging
  for (const item of cart) {
    const product = PRODUCTS.find(p => p.id === item.productId)
    if (!product) {
      log.warn(`Order rejected for user ${userId}: product ${item.productId} not found`)
      return res.status(400).json({ error: `Product ${item.productId} not found` })
    }
    if (product.stock < item.qty) {
      log.warn(`Order rejected for user ${userId}: not enough stock for ${product.name} (want ${item.qty}, have ${product.stock})`)
      return res.status(400).json({ error: `Insufficient stock for "${product.name}": requested ${item.qty}, available ${product.stock}` })
    }
  }

  const items = cart.map(item => {
    const product = PRODUCTS.find(p => p.id === item.productId)!
    product.stock -= item.qty
    return { product, qty: item.qty }
  })

  const rawTotal = items.reduce((sum, i) => sum + i.product.price * i.qty, 0)

  // Apply loyalty discount for orders above 500 cr
  let total = rawTotal
  if (rawTotal > 500) {
    const tier = DISCOUNT_TIERS.find(t => rawTotal >= t.threshold)
    const savings = +(rawTotal * (tier!.percentage / 100)).toFixed(2)
    total = +(rawTotal - savings).toFixed(2)
    log.info(`Loyalty discount applied for user ${userId}: saved $${savings} (${tier!.percentage}% off $${rawTotal}), new total $${total}`)
  }

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

  log.info(`Order ${order.id} placed for user ${userId}: ${items.length} item(s), total $${order.total}`)

  res.status(201).json(order)
})

app.get('/api/orders/:userId', (req, res) => {
  const userOrders = orders.filter(o => o.userId === req.params.userId)

  // Summarise the highest-value order for the profile badge
  const topOrder = userOrders.sort((a, b) => b.total - a.total)[0]
  const topItem  = topOrder.items.sort((a, b) => b.product.price - a.product.price)[0]

  res.json({
    orders: userOrders,
    total: userOrders.length,
    highlight: { orderId: topOrder.id, topItem: topItem.product.name, value: topOrder.total },
  })
})

app.get('/api/orders', (_req, res) => {
  res.json({ orders, total: orders.length })
})

// ── Auth (fake — just issues a userId) ───────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username } = req.body
  if (!username) return res.status(400).json({ error: 'username required' })
  const userId = `user-${username.toLowerCase().replace(/\s+/g, '-')}`
  log.info(`User logged in: ${username} (${userId})`)
  res.json({ userId, username, token: `tok-${uuidv4()}` })
})

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  log.warn(`404 ${req.method} ${req.path}`)
  res.status(404).json({ error: 'Not found' })
})

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log.error(`Unhandled error: ${err.message}\n${err.stack}`)
  res.status(500).json({ error: 'Internal server error', message: err.message })
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  log.info(`starwars-shop listening on port ${PORT}`)
})
