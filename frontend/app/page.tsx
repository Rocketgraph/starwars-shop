'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Product {
  id: string
  name: string
  price: number
  category: string
  stock: number
  description: string
  image: string
  rating: number
}

const CATEGORIES = ['weapons', 'droids', 'ships', 'armor', 'force', 'collectibles']
const CATEGORY_LABELS: Record<string, string> = {
  weapons: '⚔️ Weapons', droids: '🤖 Droids', ships: '🚀 Ships',
  armor: '🛡️ Armor', force: '🔮 Force', collectibles: '🏆 Collectibles',
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 text-xs">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
      <span className="text-gray-500 ml-1">{rating.toFixed(1)}</span>
    </span>
  )
}

function ProductGrid() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const category = searchParams.get('category') ?? ''
  const search   = searchParams.get('search') ?? ''

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [query, setQuery]       = useState(search)
  const [adding, setAdding]     = useState<string | null>(null)
  const [added, setAdded]       = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (search)   params.set('search', search)
    params.set('sort', 'rating')

    fetch(`${API}/api/products?${params}`)
      .then(r => r.json())
      .then(d => { setProducts(d.products ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [category, search])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (query) p.set('search', query)
    router.push(`/?${p}`)
  }

  const addToCart = async (productId: string) => {
    const userId = localStorage.getItem('userId') ?? 'guest'
    setAdding(productId)
    await fetch(`${API}/api/cart/${userId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, qty: 1 }),
    })
    setAdding(null)
    setAdded(productId)
    setTimeout(() => setAdded(null), 1500)
  }

  return (
    <>
      {/* Hero */}
      <div className="text-center mb-10 py-8">
        <h1 className="text-4xl font-bold text-yellow-400 tracking-widest uppercase mb-2">
          Galactic Emporium
        </h1>
        <p className="text-gray-400 text-sm">The finest goods from a galaxy far, far away</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-lg mx-auto">
        <input
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-4 py-2 text-sm focus:outline-none focus:border-yellow-500"
          placeholder="Search lightsabers, droids, ships..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button className="bg-yellow-400 text-black px-4 py-2 rounded text-sm font-semibold hover:bg-yellow-300">
          Search
        </button>
      </form>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => router.push('/')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            !category ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => router.push(`/?category=${c}`)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              category === c ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center text-gray-500 py-20">Loading inventory...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => (
            <div
              key={product.id}
              className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex flex-col hover:border-yellow-500/40 transition-colors"
            >
              <div className="text-5xl text-center py-6">{product.image}</div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
                  <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                    product.stock === 0 ? 'bg-red-900/50 text-red-400' :
                    product.stock <= 3  ? 'bg-orange-900/50 text-orange-400' :
                                          'bg-green-900/30 text-green-500'
                  }`}>
                    {product.stock === 0 ? 'Sold Out' : product.stock <= 3 ? `${product.stock} left` : 'In Stock'}
                  </span>
                </div>
                <Stars rating={product.rating} />
                <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{product.description}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-yellow-400 font-bold">
                  {product.price >= 10000
                    ? `${(product.price / 1000).toFixed(0)}k cr`
                    : `${product.price.toLocaleString()} cr`}
                </span>
                <button
                  onClick={() => addToCart(product.id)}
                  disabled={product.stock === 0 || adding === product.id}
                  className={`text-xs px-3 py-1.5 rounded font-semibold transition-colors ${
                    added === product.id
                      ? 'bg-green-600 text-white'
                      : product.stock === 0
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-yellow-400 text-black hover:bg-yellow-300'
                  }`}
                >
                  {added === product.id ? '✓ Added' : adding === product.id ? '...' : 'Add to Cart'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="text-center text-gray-500 py-20">
          <div className="text-4xl mb-4">🔭</div>
          <p>No items found in this sector of the galaxy.</p>
        </div>
      )}
    </>
  )
}

export default function Home() {
  return (
    <Suspense>
      <ProductGrid />
    </Suspense>
  )
}
