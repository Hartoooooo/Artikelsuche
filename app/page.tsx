'use client'

import { useState, FormEvent, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const [articleNumber, setArticleNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const isPasteRef = useRef(false)

  const performSearch = async (trimmed: string) => {
    if (!trimmed) {
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/product?articleNumber=${encodeURIComponent(trimmed)}`
      )

      if (response.ok) {
        router.push(`/product/${encodeURIComponent(trimmed)}`)
      } else if (response.status === 404) {
        setError('Produkt nicht gefunden')
        setIsLoading(false)
      } else {
        const data = await response.json()
        setError(data.error || 'Fehler beim Laden des Produkts')
        setIsLoading(false)
      }
    } catch (err) {
      setError('Fehler beim Laden des Produkts')
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = articleNumber.trim()
    if (!trimmed) {
      setError('Bitte geben Sie eine Artikelnummer ein')
      return
    }
    await performSearch(trimmed)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    isPasteRef.current = true
    // Kurze Verzögerung, damit der Wert im Input gesetzt ist
    setTimeout(() => {
      const pastedValue = e.clipboardData.getData('text')
      const trimmed = pastedValue.trim()
      if (trimmed.length > 0) {
        setArticleNumber(trimmed)
        performSearch(trimmed)
      }
      isPasteRef.current = false
    }, 50)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setArticleNumber(newValue)
    // Wenn es ein Paste-Event war, wurde die Suche bereits gestartet
    if (!isPasteRef.current) {
      setError(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl text-center mb-8 text-gray-800">
          Produktsuche
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="articleNumber" className="sr-only">
              Artikelnummer
            </label>
            <input
              id="articleNumber"
              type="text"
              value={articleNumber}
              onChange={handleChange}
              onPaste={handlePaste}
              placeholder="Artikelnummer eingeben"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-lg"
              disabled={isLoading}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Suche...' : 'Suchen'}
          </button>
        </form>
        <div className="mt-8 text-center">
          <Link
            href="/database"
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Zur Datenbankübersicht
          </Link>
        </div>
      </div>
    </div>
  )
}
