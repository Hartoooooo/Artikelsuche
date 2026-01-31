export interface Product {
  id: string
  Artikelnummer: string
  Beschreibung: string | null
  'Einkaufspreise 2026 € ohne Mwst.': string | null
  'Einkaufspreise 2026 mit A Kundenrabatt': string | null
  'Empf. VK-Preise 2026 € ohne Mwst.': string | null
}

export interface ProductsResponse {
  items: Product[]
  total: number
  page: number
  pageSize: number
}
