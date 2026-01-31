import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl text-gray-800 mb-4">Produkt nicht gefunden</h1>
        <p className="text-gray-600 mb-6">
          Das gesuchte Produkt konnte nicht gefunden werden.
        </p>
        <Link
          href="/"
          className="text-gray-600 hover:text-gray-800 underline"
        >
          Zurück zur Suche
        </Link>
      </div>
    </div>
  )
}
