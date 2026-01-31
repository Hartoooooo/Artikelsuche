import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

const CATEGORIES = ['Scaler', 'Kürette', 'Schere', 'Nadelhalter', 'Raspatorium', 'Zahnzange', 'IMS']

// Mapping für Suchvarianten (Singular/Plural)
const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  'Scaler': ['Scaler', 'Scaler'],
  'Kürette': ['Kürette', 'Küretten'],
  'Schere': ['Schere', 'Scheren'],
  'Nadelhalter': ['Nadelhalter', 'Nadelhalter'],
  'Raspatorium': ['Raspatorium', 'Raspatorien'],
  'Zahnzange': ['Zahnzange', 'Zahnzangen'],
  'IMS': ['IMS']
}

export async function GET(request: NextRequest) {
  try {
    const counts: Record<string, number> = {}

    // Zähle Produkte für jede Kategorie
    for (const category of CATEGORIES) {
      const searchTerms = CATEGORY_SEARCH_TERMS[category] || [category]
      
      // Suche nach allen Varianten (Singular und Plural)
      const orConditions = searchTerms.map(term => `Beschreibung.ilike.%${term}%`).join(',')
      
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .or(orConditions)

      if (error) {
        counts[category] = 0
      } else {
        counts[category] = count || 0
      }
    }

    return NextResponse.json(counts, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unerwarteter Fehler' },
      { status: 500 }
    )
  }
}
