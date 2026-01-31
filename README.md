# Preissuche

Eine Produktsuche-Anwendung mit Next.js 14+ (App Router), TypeScript, TailwindCSS und Supabase.

## Features

- **Landing-Seite (`/`)**: Zentrierte Suchleiste für Artikelnummer-Suche
- **Datenbankübersicht (`/database`)**: Durchsuchbare Tabelle aller Produkte mit Pagination
- **Produktdetailseite (`/product/[articleNumber]`)**: Detaillierte Ansicht eines einzelnen Produkts

## Setup

### 1. Dependencies installieren

```bash
npm install
```

### 2. Umgebungsvariablen konfigurieren

Erstelle eine `.env.local` Datei im Projektroot:

```bash
cp .env.example .env.local
```

Füge deine Supabase-Credentials ein:

```
NEXT_PUBLIC_SUPABASE_URL=deine_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein_supabase_anon_key
```

### 3. Supabase Datenbank einrichten

Erstelle eine Tabelle `products` mit folgendem Schema:

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  currency TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_article_number ON products(article_number);
```

### 4. Entwicklungsserver starten

```bash
npm run dev
```

Die Anwendung läuft dann auf [http://localhost:3000](http://localhost:3000).

## Projektstruktur

```
├── app/
│   ├── api/
│   │   ├── product/
│   │   │   └── route.ts          # API: Einzelnes Produkt abrufen
│   │   └── products/
│   │       └── route.ts          # API: Produktliste mit Suche & Pagination
│   ├── database/
│   │   └── page.tsx              # Datenbankübersicht
│   ├── product/
│   │   └── [articleNumber]/
│   │       ├── page.tsx          # Produktdetailseite
│   │       └── not-found.tsx     # 404-Seite
│   ├── globals.css               # Globale Styles
│   ├── layout.tsx                # Root Layout
│   └── page.tsx                  # Landing-Seite
├── lib/
│   ├── supabase/
│   │   └── server.ts             # Supabase Client
│   └── validators.ts             # Validierungsfunktionen
├── types/
│   └── product.ts                # TypeScript Types
└── .env.example                  # Beispiel-Umgebungsvariablen
```

## Technologien

- **Next.js 14+** mit App Router
- **TypeScript** für Type-Safety
- **TailwindCSS** für Styling
- **Supabase** als Backend/Datenbank
- **React Server Components** für serverseitiges Rendering

## API Endpoints

### GET `/api/product?articleNumber={articleNumber}`

Ruft ein einzelnes Produkt anhand der Artikelnummer ab.

**Response (200):**
```json
{
  "id": "uuid",
  "article_number": "ART-123",
  "name": "Produktname",
  "description": "Beschreibung",
  "price": 29.99,
  "currency": "EUR",
  "image_url": "https://...",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Response (404):**
```json
{
  "error": "Produkt nicht gefunden"
}
```

### GET `/api/products?q={query}&page={page}&pageSize={pageSize}`

Ruft eine Liste von Produkten mit optionaler Suche und Pagination ab.

**Query Parameter:**
- `q` (optional): Suchbegriff für Artikelnummer oder Name
- `page` (optional, default: 1): Seitennummer
- `pageSize` (optional, default: 20, max: 100): Anzahl Ergebnisse pro Seite

**Response (200):**
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```
