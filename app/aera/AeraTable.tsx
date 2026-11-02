'use client'

import { useMemo, useState } from 'react'
import { AeraItem, formatEuro, formatDateTime, normSku, STATUS_LABEL } from '@/lib/aera'

export default function AeraTable({ items }: { items: AeraItem[] }) {
  const [q, setQ] = useState('')
  const [onlyFound, setOnlyFound] = useState(false)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const needleSku = normSku(q)
    return items.filter((i) => {
      if (onlyFound && i.status !== 'ok') return false
      if (!needle) return true
      return (
        (needleSku && normSku(i.sku).includes(needleSku)) ||
        (i.name || '').toLowerCase().includes(needle) ||
        (i.aera_name || '').toLowerCase().includes(needle)
      )
    })
  }, [items, q, onlyFound])

  return (
    <>
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Artikelnummer oder Name…"
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 px-2">
          <input type="checkbox" checked={onlyFound} onChange={(e) => setOnlyFound(e.target.checked)} />
          nur auf AERA gefundene
        </label>
      </div>

      <div className="mb-2 text-sm text-gray-600">{rows.length} Artikel</div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 bg-white">
          <thead>
            <tr className="bg-gray-50 text-left text-xs md:text-sm text-gray-700">
              <th className="border border-gray-300 px-3 py-3">Nummer</th>
              <th className="border border-gray-300 px-3 py-3">Produkt</th>
              <th className="border border-gray-300 px-3 py-3 whitespace-nowrap">AERA ab</th>
              <th className="border border-gray-300 px-3 py-3 whitespace-nowrap hidden md:table-cell">Spanne</th>
              <th className="border border-gray-300 px-3 py-3 hidden md:table-cell">Angebote</th>
              <th className="border border-gray-300 px-3 py-3 hidden md:table-cell">Stand</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.sku} className="hover:bg-gray-50 text-xs md:text-sm text-gray-800 align-top">
                <td className="border border-gray-300 px-3 py-3 whitespace-nowrap">{i.sku}</td>
                <td className="border border-gray-300 px-3 py-3">
                  {i.name || i.aera_name || '–'}
                  {i.best_supplier && (
                    <div className="text-xs text-gray-500 mt-1">günstigster Händler: {i.best_supplier}</div>
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-3 whitespace-nowrap">
                  {i.status === 'ok' && i.aera_url ? (
                    <a href={i.aera_url} target="_blank" rel="noopener noreferrer" className="underline">
                      {formatEuro(i.best_price)}
                    </a>
                  ) : (
                    <span className="text-gray-500">{STATUS_LABEL[i.status] ?? i.status}</span>
                  )}
                  {i.stale && <div className="text-xs text-amber-700">alter Stand</div>}
                </td>
                <td className="border border-gray-300 px-3 py-3 whitespace-nowrap hidden md:table-cell">
                  {i.min_price !== null && i.max_price !== null
                    ? `${formatEuro(i.min_price)} – ${formatEuro(i.max_price)}`
                    : '–'}
                </td>
                <td className="border border-gray-300 px-3 py-3 hidden md:table-cell">{i.offers ?? '–'}</td>
                <td className="border border-gray-300 px-3 py-3 whitespace-nowrap hidden md:table-cell">
                  {formatDateTime(i.price_updated_at || i.checked_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
