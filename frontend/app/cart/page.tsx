'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface CartItem {
  product: { id: string; name: string; price: number; image: string; stock: number }
  qty: number
}
interface Cart { userId: string; items: CartItem[]; total: number; itemCount: number }

export default function CartPage() {
  const [cart, setCart]         = useState<Cart | null>(null)
  const [loading, setLoading]   = useState(true)
  const [ordering, setOrdering] = useState(false)
  const [orderId, setOrderId]   = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const userId = typeof window !== 'undefined'
    ? (localStorage.getItem('userId') ?? 'guest')
    : 'guest'

  const fetchCart = async () => {
    setLoading(true)
    const r = await fetch(`${API}/api/cart/${userId}`)
    setCart(await r.json())
    setLoading(false)
  }

  useEffect(() => { fetchCart() }, [])

  const remove = async (productId: string) => {
    await fetch(`${API}/api/cart/${userId}/items/${productId}`, { method: 'DELETE' })
    fetchCart()
  }

  const checkout = async () => {
    setOrdering(true)
    setError(null)
    const r = await fetch(`${API}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await r.json()
    setOrdering(false)
    if (r.ok) {
      setOrderId(data.id)
      fetchCart()
    } else {
      setError(data.error ?? 'Order failed')
    }
  }

  if (loading) return <div className="text-center text-gray-500 py-20">Loading cart...</div>

  if (orderId) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">Order Confirmed!</h2>
        <p className="text-gray-400 text-sm mb-1">Order ID: <code className="text-yellow-300">{orderId}</code></p>
        <p className="text-gray-500 text-sm mb-8">May the Force be with your delivery.</p>
        <Link href="/" className="bg-yellow-400 text-black px-6 py-2.5 rounded font-semibold hover:bg-yellow-300">
          Continue Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">Your Cart</h1>

      {cart?.items.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🛒</div>
          <p className="text-gray-400 mb-6">Your cart is emptier than the Tatooine desert.</p>
          <Link href="/" className="bg-yellow-400 text-black px-6 py-2.5 rounded font-semibold hover:bg-yellow-300">
            Browse Inventory
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-8">
            {cart?.items.map(item => (
              <div key={item.product.id} className="flex items-center gap-4 bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                <span className="text-3xl">{item.product.image}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{item.product.name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.qty}</p>
                </div>
                <span className="text-yellow-400 font-bold text-sm">
                  {(item.product.price * item.qty).toLocaleString()} cr
                </span>
                <button
                  onClick={() => remove(item.product.id)}
                  className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded border border-red-900/40 hover:border-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between text-sm mb-4">
              <span className="text-gray-400">Total</span>
              <span className="text-yellow-400 font-bold text-lg">{cart?.total.toLocaleString()} credits</span>
            </div>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button
              onClick={checkout}
              disabled={ordering}
              className="w-full bg-yellow-400 text-black py-3 rounded font-bold hover:bg-yellow-300 disabled:opacity-50 transition-colors"
            >
              {ordering ? 'Processing...' : 'Place Order'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
