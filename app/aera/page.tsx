import Link from 'next/link'
import { aera, formatDateTime } from '@/lib/aera'
import AeraTable from './AeraTable'

export const metadata = {
  title: 'AERA-Preise | Preissuche',
}

export default function AeraPage() {
  const found = aera.items.filter((i) => i.status === 'ok').length

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-800 underline mb-6 inline-block">
          Zurück zur Übersicht
        </Link>

        <h1 className="text-2xl text-gray-800 mb-2">AERA-Preise</h1>
        <p className="text-sm text-gray-600 mb-6">
          Zuletzt aktualisiert: <span className="text-gray-800">{formatDateTime(aera.updated_at)}</span>
          {aera.items.length > 0 && (
            <> · {found} von {aera.items.length} Artikeln auf AERA gefunden</>
          )}
          <br />
          Günstigstes öffentlich sichtbares Angebot (netto), täglich automatisch abgefragt.
        </p>

        {aera.items.length === 0 ? (
          <p className="text-center text-gray-600 py-8">
            Noch keine Daten – der erste Abruf läuft über GitHub Actions.
          </p>
        ) : (
          <AeraTable items={aera.items} />
        )}
      </div>
    </div>
  )
}
