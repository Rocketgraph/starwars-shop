import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Galactic Emporium',
  description: 'The galaxy\'s finest goods — lightsabers, droids, ships and more',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f] text-gray-100">
        {/* Nav */}
        <nav className="border-b border-yellow-500/20 bg-black/60 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2 font-bold text-yellow-400 text-lg tracking-widest uppercase">
              <span>⭐</span> Galactic Emporium
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/?category=weapons"      className="text-gray-400 hover:text-yellow-400 transition-colors">Weapons</Link>
              <Link href="/?category=droids"       className="text-gray-400 hover:text-yellow-400 transition-colors">Droids</Link>
              <Link href="/?category=ships"        className="text-gray-400 hover:text-yellow-400 transition-colors">Ships</Link>
              <Link href="/?category=armor"        className="text-gray-400 hover:text-yellow-400 transition-colors">Armor</Link>
              <Link href="/?category=force"        className="text-gray-400 hover:text-yellow-400 transition-colors">Force</Link>
              <Link href="/?category=collectibles" className="text-gray-400 hover:text-yellow-400 transition-colors">Collectibles</Link>
              <Link href="/cart" className="flex items-center gap-1 bg-yellow-400 text-black px-3 py-1.5 rounded font-semibold hover:bg-yellow-300 transition-colors">
                🛒 Cart
              </Link>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-yellow-500/10 mt-16 py-6 text-center text-xs text-gray-600">
          May the Force be with your purchase. © {new Date().getFullYear()} Galactic Emporium
        </footer>
      </body>
    </html>
  )
}
