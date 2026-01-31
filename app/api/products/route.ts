import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { validatePage, validatePageSize } from '@/lib/validators'
import { ProductsResponse } from '@/types/product'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')?.trim() || ''
    const page = validatePage(searchParams.get('page'))
    const pageSize = validatePageSize(searchParams.get('pageSize'))

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase.from('products').select('*', { count: 'exact' })

    if (q) {
      query = query.or(`Artikelnummer.ilike.%${q}%,Beschreibung.ilike.%${q}%`)
    }

    query = query.order('id', { ascending: false })
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
