import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { validateArticleNumber } from '@/lib/validators'
import { Product } from '@/types/product'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const articleNumber = searchParams.get('articleNumber')

    if (!articleNumber) {
      return NextResponse.json(
        { error: 'Artikelnummer ist erforderlich' },
        { status: 400 }
      )
    }

    const validationError = validateArticleNumber(articleNumber)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const trimmedArticleNumber = articleNumber.trim()
    // Artikelnummern sind in der Datenbank immer großgeschrieben, daher direkt umwandeln
    const upperCaseArticleNumber = trimmedArticleNumber.toUpperCase()

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('Artikelnummer', upperCaseArticleNumber)
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Produkt nicht gefunden' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Fehler beim Abrufen des Produkts' },
        { status: 500 }
      )
    }

    return NextResponse.json(data as Product, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unerwarteter Fehler' },
      { status: 500 }
    )
  }
}
