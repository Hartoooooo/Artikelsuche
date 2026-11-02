import aeraData from '@/data/aera-prices.json'

export interface AeraItem {
  sku: string
  name: string
  micro_url: string | null
  status: 'ok' | 'no_price' | 'not_found' | 'error'
  checked_at: string
  aera_name: string | null
  manufacturer: string | null
  aera_url: string | null
  best_price: number | null
  best_unit: string | null
  best_supplier: string | null
  min_price: number | null
  max_price: number | null
  offers: number | null
  price_updated_at: string | null
  stale?: boolean
}

export interface AeraData {
  updated_at: string | null
  source: string
  counts: Record<string, number>
  items: AeraItem[]
}

export const aera = aeraData as unknown as AeraData

export function normSku(sku: string): string {
  return (sku || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

const bySku = new Map(aera.items.map((i) => [normSku(i.sku), i]))

export function getAeraItem(sku: string): AeraItem | undefined {
  return bySku.get(normSku(sku))
}

export function formatEuro(value: number | null | undefined): string {
  if (value === null || value === undefined) return '–'
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'noch nie'
  return new Date(iso).toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const STATUS_LABEL: Record<AeraItem['status'], string> = {
  ok: 'gefunden',
  no_price: 'ohne Preis',
  not_found: 'nicht auf AERA',
  error: 'Fehler',
}
