import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase/server'
import { Product } from '@/types/product'
import Link from 'next/link'
import { getAeraItem, formatEuro, formatDateTime, STATUS_LABEL } from '@/lib/aera'

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

  const aeraItem = getAeraItem(product.Artikelnummer)

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

          {aeraItem && (
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg text-gray-800 mb-3">AERA-Online</h2>
              {aeraItem.status === 'ok' ? (
                <div className="space-y-1 text-gray-800">
                  <p className="text-lg">
                    ab {formatEuro(aeraItem.best_price)}
                    {aeraItem.best_unit && <span className="text-sm text-gray-600"> / {aeraItem.best_unit}</span>}
                  </p>
                  {aeraItem.best_supplier && (
                    <p className="text-sm text-gray-600">günstigster Händler: {aeraItem.best_supplier}</p>
                  )}
                  {aeraItem.min_price !== null && aeraItem.max_price !== null && (
                    <p className="text-sm text-gray-600">
                      {aeraItem.offers ?? '?'} Angebote zwischen {formatEuro(aeraItem.min_price)} und {formatEuro(aeraItem.max_price)}
                    </p>
                  )}
                  {aeraItem.aera_url && (
                    <a href={aeraItem.aera_url} target="_blank" rel="noopener noreferrer" className="text-sm underline text-gray-600">
                      Auf AERA ansehen
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">{STATUS_LABEL[aeraItem.status] ?? aeraItem.status}</p>
              )}
              <p className="text-xs text-gray-500 mt-3">
                Preis-Stand: {formatDateTime(aeraItem.price_updated_at || aeraItem.checked_at)}
                {aeraItem.stale && ' (alter Stand, letzter Abruf fehlgeschlagen)'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
