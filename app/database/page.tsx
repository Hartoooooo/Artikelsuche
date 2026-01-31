'use client'

import { useState, useEffect, FormEvent, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Product, ProductsResponse } from '@/types/product'

function DatabaseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10))
  const [pageSize] = useState(20)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      params.set('page', page.toString())
      params.set('pageSize', pageSize.toString())

      const response = await fetch(`/api/products?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Produkte')
      }

      const data: ProductsResponse = await response.json()
      setProducts(data.items)
      setTotal(data.total)
    } catch (err) {
      setError('Fehler beim Laden der Produkte')
      setProducts([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, page, pageSize])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPage(1)
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    params.set('page', '1')
    router.push(`/database?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    params.set('page', newPage.toString())
    router.push(`/database?${params.toString()}`)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-800 underline mb-4 inline-block"
          >
            Zurück zur Suche
          </Link>
          <h1 className="text-2xl text-gray-800 mb-6">Datenbankübersicht</h1>

          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suche nach Artikelnummer oder Beschreibung..."
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Suchen
              </button>
            </div>
          </form>

          {isLoading ? (
            <p className="text-center text-gray-600 py-8">Lade Produkte...</p>
          ) : error ? (
            <p className="text-center text-red-600 py-8">{error}</p>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-600 py-8">
              Keine Produkte gefunden
            </p>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600">
                {total} Produkt{total !== 1 ? 'e' : ''} gefunden
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 bg-white">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm text-gray-700">
                        Artikelnummer
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm text-gray-700">
                        Beschreibung
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm text-gray-700">
                        Einkaufspreise 2026 € ohne Mwst.
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm text-gray-700">
                        Einkaufspreise 2026 mit A Kundenrabatt
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm text-gray-700">
                        Empf. VK-Preise 2026 € ohne Mwst.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/product/${encodeURIComponent(product.Artikelnummer)}`)}>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-800">
                          {product.Artikelnummer}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-800">
                          {product.Beschreibung || '-'}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-800">
                          {product['Einkaufspreise 2026 € ohne Mwst.'] || '-'}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-800">
                          {product['Einkaufspreise 2026 mit A Kundenrabatt'] || '-'}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-800">
                          {product['Empf. VK-Preise 2026 € ohne Mwst.'] || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Zurück
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Seite {page} von {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages || isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Weiter
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DatabasePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Lade...</p>
      </div>
    }>
      <DatabaseContent />
    </Suspense>
  )
}
