export interface Product {
  Artikelnummer: string
  Beschreibung: string | null
  'Einkaufspreise 2026 € ohne Mwst.': string | null
  'Empf. VK-Preise 2026 € ohne Mwst.': string | null
  'AERA Preis € ohne Mwst.'?: number | string | null
  'AERA Link'?: string | null
  'AERA Stand'?: string | null
}

export interface ProductsResponse {
  items: Product[]
  total: number
  page: number
  pageSize: number
}
