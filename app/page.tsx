'use client'

import { useState, useEffect, FormEvent, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Product, ProductsResponse } from '@/types/product'

const CATEGORIES = ['Scaler', 'Kürette', 'Schere', 'Nadelhalter', 'Raspatorium', 'Zahnzange', 'IMS']

function DatabaseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10))
  const [pageSize] = useState(20)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})

  const loadCategoryCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/products/counts')
      if (response.ok) {
        const counts = await response.json()
        setCategoryCounts(counts)
      }
    } catch (err) {
      // Fehler beim Laden der Counts ignorieren
    }
  }, [])

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      if (selectedCategory) params.set('category', selectedCategory)
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
  }, [searchQuery, selectedCategory, page, pageSize])

  useEffect(() => {
    loadCategoryCounts()
  }, [loadCategoryCounts])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPage(1)
    updateURL(1, searchQuery, selectedCategory)
  }

  const handleCategoryClick = (category: string) => {
    const newCategory = selectedCategory === category ? '' : category
    setSelectedCategory(newCategory)
    setPage(1)
    updateURL(1, searchQuery, newCategory)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    updateURL(newPage, searchQuery, selectedCategory)
  }

  const updateURL = (newPage: number, query: string, category: string) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (category) params.set('category', category)
    params.set('page', newPage.toString())
    router.push(`/?${params.toString()}`)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl text-gray-800 mb-6">Datenbankübersicht</h1>

          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2 mb-4">
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
            <div className="hidden md:flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryClick(category)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedCategory === category
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category} ({categoryCounts[category] || 0})
                </button>
              ))}
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
                      <th className="border border-gray-300 px-4 py-3 text-left text-xs md:text-sm text-gray-700">
                        <span className="hidden md:inline">Artikelnummer</span>
                        <span className="md:hidden">Nummer</span>
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-xs md:text-sm text-gray-700">
                        Beschreibung
                      </th>
                      <th className="border border-gray-300 px-2 md:px-4 py-3 text-left text-xs md:text-sm text-gray-700 whitespace-nowrap min-w-[80px]">
                        <span className="hidden md:inline">Einkaufspreise 2026 mit A</span>
                        <span className="md:hidden">EK A Rabatt</span>
                      </th>
                      <th className="border border-gray-300 px-2 md:px-4 py-3 text-left text-xs md:text-sm text-gray-700 whitespace-nowrap min-w-[80px]">
                        <span className="hidden md:inline">Einkaufspreise 2026 €</span>
                        <span className="md:hidden">EK Preis</span>
                      </th>
                      <th className="border border-gray-300 px-2 md:px-4 py-3 text-left text-xs md:text-sm text-gray-700 whitespace-nowrap min-w-[80px]">
                        <span className="hidden md:inline">Empf. VK-Preise 2026 €</span>
                        <span className="md:hidden">VK Preis</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/product/${encodeURIComponent(product.Artikelnummer)}`)}>
                        <td className="border border-gray-300 px-4 py-3 text-xs md:text-sm text-gray-800">
                          {product.Artikelnummer}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-xs md:text-sm text-gray-800">
                          {product.Beschreibung || '-'}
                        </td>
                        <td className="border border-gray-300 px-2 md:px-4 py-3 text-xs md:text-sm text-gray-800 whitespace-nowrap min-w-[80px]">
                          {product['Einkaufspreise 2026 mit A Kundenrabatt'] || '-'}
                        </td>
                        <td className="border border-gray-300 px-2 md:px-4 py-3 text-xs md:text-sm text-gray-800 whitespace-nowrap min-w-[80px]">
                          {product['Einkaufspreise 2026 € ohne Mwst.'] || '-'}
                        </td>
                        <td className="border border-gray-300 px-2 md:px-4 py-3 text-xs md:text-sm text-gray-800 whitespace-nowrap min-w-[80px]">
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

export default function HomePage() {
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
