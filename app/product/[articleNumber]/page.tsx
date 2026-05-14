import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase/server'
import { Product } from '@/types/product'
import Link from 'next/link'

async function getProduct(articleNumber: string): Promise<Product | null> {
  try {
    // Artikelnummern sind in der Datenbank immer großgeschrieben, daher direkt umwandeln
    const upperCaseArticleNumber = articleNumber.toUpperCase()
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('Artikelnummer', upperCaseArticleNumber)
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data as Product
  } catch {
    return null
  }
}

export default async function ProductPage({
  params,
}: {
  params: { articleNumber: string }
}) {
  const decodedArticleNumber = decodeURIComponent(params.articleNumber)
  const product = await getProduct(decodedArticleNumber)

  if (!product) {
    notFound()
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="text-sm text-gray-600 hover:text-gray-800 underline mb-6 inline-block"
        >
          Zurück zur Übersicht
        </Link>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl text-gray-800 mb-2">
            {product.Beschreibung || product.Artikelnummer}
          </h1>

          <p className="text-sm text-gray-600 mb-6">
            Artikelnummer: {product.Artikelnummer}
          </p>

          {product.Beschreibung && (
            <div className="mb-6">
              <h2 className="text-lg text-gray-800 mb-2">Beschreibung</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {product.Beschreibung}
              </p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            {product['Einkaufspreise 2026 € ohne Mwst.'] && (
              <div>
                <h3 className="text-sm text-gray-600 mb-1">Einkaufspreis 2026 (ohne MwSt.)</h3>
                <p className="text-lg text-gray-800">{product['Einkaufspreise 2026 € ohne Mwst.']} €</p>
              </div>
            )}

            {product['Empf. VK-Preise 2026 € ohne Mwst.'] && (
              <div>
                <h3 className="text-sm text-gray-600 mb-1">Empfohlener VK-Preis 2026 (ohne MwSt.)</h3>
                <p className="text-lg text-gray-800">{product['Empf. VK-Preise 2026 € ohne Mwst.']} €</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
