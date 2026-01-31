export function validateArticleNumber(articleNumber: string): string | null {
  const trimmed = articleNumber.trim()
  if (trimmed.length === 0) {
    return 'Artikelnummer darf nicht leer sein'
  }
  if (trimmed.length > 64) {
    return 'Artikelnummer darf maximal 64 Zeichen lang sein'
  }
  return null
}

export function validatePage(page: string | null | undefined): number {
  const parsed = parseInt(page || '1', 10)
  return isNaN(parsed) || parsed < 1 ? 1 : parsed
}

export function validatePageSize(pageSize: string | null | undefined): number {
  const parsed = parseInt(pageSize || '20', 10)
  if (isNaN(parsed) || parsed < 1) return 1
  if (parsed > 100) return 100
  return parsed
}
