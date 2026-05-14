import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { validatePage, validatePageSize } from '@/lib/validators'
import { ProductsResponse } from '@/types/product'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')?.trim() || ''
    const category = searchParams.get('category')?.trim() || ''
    const page = validatePage(searchParams.get('page'))
    const pageSize = validatePageSize(searchParams.get('pageSize'))

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase.from('products').select('*', { count: 'exact' })

    // Mapping für Suchvarianten (Singular/Plural)
    const getCategorySearchTerms = (cat: string): string[] => {
      const mapping: Record<string, string[]> = {
        'Scaler': ['Scaler'],
        'Kürette': ['Kürette', 'Küretten'],
        'Schere': ['Schere', 'Scheren'],
        'Nadelhalter': ['Nadelhalter'],
        'Raspatorium': ['Raspatorium', 'Raspatorien'],
        'Zahnzange': ['Zahnzange', 'Zahnzangen'],
        'IMS': ['IMS']
      }
      return mapping[cat] || [cat]
    }

    // Kategoriefilter und Suchfilter kombinieren
    if (category && q) {
      // Beide Filter: Kategorie UND (Artikelnummer ODER Beschreibung enthält Suchbegriff)
      const categoryTerms = getCategorySearchTerms(category)
      const categoryOr = categoryTerms.map(term => `Beschreibung.ilike.%${term}%`).join(',')
      query = query
        .or(categoryOr)
        .or(`Artikelnummer.ilike.%${q}%,Beschreibung.ilike.%${q}%`)
    } else if (category) {
      // Nur Kategoriefilter - suche nach Singular und Plural
      const categoryTerms = getCategorySearchTerms(category)
      const categoryOr = categoryTerms.map(term => `Beschreibung.ilike.%${term}%`).join(',')
      query = query.or(categoryOr)
    } else if (q) {
      // Nur Suchfilter
      query = query.or(`Artikelnummer.ilike.%${q}%,Beschreibung.ilike.%${q}%`)
    }

    query = query.order('Artikelnummer', { ascending: true })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Fehler beim Abrufen der Produkte' },
        { status: 500 }
      )
    }

    const response: ProductsResponse = {
      items: (data || []) as any[],
      total: count || 0,
      page,
      pageSize,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unerwarteter Fehler' },
      { status: 500 }
    )
  }
}
