#!/usr/bin/env python3
"""
AERA-Preisscraper für das Micro-Dental-Sortiment.

1. Liest die Artikelnummern aus der festen Liste data/aera-skus.txt.
   (Neu erzeugen aus dem Shop micro-dental.de: --refresh-skus)
2. Sucht jede Nummer auf aera-online.de (öffentliche Seiten, ohne Login) und liest
   Bestpreis, Preisspanne und Anzahl der Angebote aus.
3. Schreibt data/aera-prices.json (aktueller Stand) und hängt an
   data/aera-history.csv an (Preisverlauf).

Läuft täglich als GitHub Action (.github/workflows/aera-prices.yml).
Lokal: python scripts/aera_scraper.py [--limit 5] [--sku PCPUNC15]
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urljoin, quote

import requests
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
PRICES_FILE = os.path.join(DATA_DIR, "aera-prices.json")
HISTORY_FILE = os.path.join(DATA_DIR, "aera-history.csv")
SKUS_FILE = os.path.join(DATA_DIR, "aera-skus.txt")
DEBUG_DIR = os.path.join(ROOT, "aera-debug")

MICRO_SITEMAP = "https://micro-dental.de/sitemap.xml"
AERA_BASE = "https://www.aera-online.de"
AERA_SEARCH = AERA_BASE + "/Asps/Search.asp?gSearchSection=1&gSearchText={q}"

DELAY = float(os.environ.get("AERA_DELAY", "1.5"))  # Sekunden zwischen Anfragen
MAX_CANDIDATES = 4  # wie viele Suchtreffer pro Nummer geprüft werden

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; MicroDentalPreischeck/1.0; +https://micro-dental.de)",
    "Accept-Language": "de-DE,de;q=0.9",
}

PRICE_RE = r"(\d{1,3}(?:\.\d{3})*,\d{2})"


def log(*args):
    print(*args, flush=True)


def norm(sku: str) -> str:
    """Artikelnummern vergleichbar machen: nur Buchstaben/Ziffern, groß."""
    return re.sub(r"[^A-Z0-9]", "", (sku or "").upper())


def parse_price(s: str | None) -> float | None:
    if not s:
        return None
    try:
        return float(s.replace(".", "").replace(",", "."))
    except ValueError:
        return None


def get(session: requests.Session, url: str) -> requests.Response:
    for attempt in range(3):
        try:
            r = session.get(url, headers=HEADERS, timeout=30)
            time.sleep(DELAY)
            if r.status_code in (429, 500, 502, 503, 504):
                raise requests.HTTPError(f"HTTP {r.status_code}")
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            if attempt == 2:
                raise
            log(f"  retry {attempt + 1} for {url}: {e}")
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("unreachable")


# --------------------------------------------------------------------------- #
# 1. Artikelnummern von micro-dental.de
# --------------------------------------------------------------------------- #

def micro_dental_products(session: requests.Session) -> list[dict]:
    r = get(session, MICRO_SITEMAP)
    urls = sorted(set(re.findall(r"<loc>\s*(https://micro-dental\.de/produkte/[^<\s]+)\s*</loc>", r.text)))
    log(f"micro-dental.de: {len(urls)} Produktseiten in der Sitemap")
    products = []
    for url in urls:
        try:
            page = get(session, url)
        except Exception as e:  # noqa: BLE001
            log(f"  ! {url}: {e}")
            continue
        soup = BeautifulSoup(page.text, "html.parser")
        desc = ""
        for attrs in ({"name": "description"}, {"property": "og:description"}):
            tag = soup.find("meta", attrs=attrs)
            if tag and tag.get("content"):
                desc += " " + tag["content"]
        sku, source = find_sku(page.text, soup, desc)
        if not sku:
            log(f"  ? keine SKU gefunden: {url}")
            MISSING_PAGES.append(url)
            continue
        title_tag = soup.find("meta", attrs={"property": "og:title"})
        name = (title_tag.get("content") if title_tag else None) or (soup.title.string if soup.title else "")
        name = re.sub(r"\s*\|\s*micro dental\s*$", "", (name or "").strip(), flags=re.I)
        products.append({"sku": sku, "name": name, "url": url, "sku_source": source})
    return products


MISSING_PAGES: list[str] = []
SKU_TOKEN = r"[A-Z0-9][A-Z0-9/._\-]{2,30}"


def valid_sku(s: str) -> bool:
    s = s.rstrip(".,")
    return bool(re.fullmatch(SKU_TOKEN, s)) and any(c.isalpha() for c in s) or bool(re.fullmatch(r"\d[\d\-]{3,}", s))


def find_sku(html: str, soup: BeautifulSoup, desc: str) -> tuple[str | None, str | None]:
    """Artikelnummer einer micro-dental.de-Produktseite finden (mehrere Strategien)."""
    # 1. SEO-Meta-Description: "... SKU PCPUNC15 reduziert kaufen."
    m = re.search(r"\bSKU\s+(" + SKU_TOKEN + ")", desc)
    if m and valid_sku(m.group(1)):
        return m.group(1).rstrip(".,"), "meta"
    # 2. Erste Zeile direkt unter der Überschrift
    h1 = soup.find("h1")
    if h1:
        for el in h1.find_all_next(string=True, limit=15):
            t = el.strip()
            if t and t != h1.get_text(strip=True) and valid_sku(t):
                return t, "h1"
    # 3. Shopify-Daten im Next.js-Payload: "sku":"PCPUNC15" (auch escaped \"sku\":\"…\")
    for m in re.finditer(r'\\?"sku\\?"\s*:\s*\\?"([^"\\]{2,40})\\?"', html):
        if valid_sku(m.group(1).strip()):
            return m.group(1).strip(), "payload"
    # 4. Fließtext "SKU XYZ"
    m = re.search(r"\bSKU\s+(" + SKU_TOKEN + ")", soup.get_text(" "))
    if m and valid_sku(m.group(1)):
        return m.group(1).rstrip(".,"), "text"
    return None, None


def load_skus() -> list[dict]:
    if not os.path.exists(SKUS_FILE):
        return []
    out = []
    with open(SKUS_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            sku, _, name = line.partition("\t")
            if sku.strip():
                out.append({"sku": sku.strip(), "name": name.strip(), "url": None})
    return out


def write_skus(products: list[dict]) -> None:
    header = [
        "# Artikelnummern für den AERA-Preischeck (eine pro Zeile, optional mit Name nach einem Tab).",
        "# Neue Micro-Dental-Produkte hier ergänzen, entfernte löschen.",
        "# Komplett neu aus dem Shop erzeugen: python scripts/aera_scraper.py --refresh-skus",
        "",
    ]
    rows = sorted({norm(p["sku"]): p for p in products}.values(), key=lambda p: p["sku"])
    with open(SKUS_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(header + [f"{p['sku']}\t{p.get('name') or ''}" for p in rows]) + "\n")
    log(f"{len(rows)} Artikelnummern nach {SKUS_FILE} geschrieben.")


# --------------------------------------------------------------------------- #
# 2. AERA-Abfrage
# --------------------------------------------------------------------------- #

def parse_aera_product(html: str, url: str, sku: str) -> dict | None:
    """Liest eine AERA-Produktseite. Gibt None zurück, wenn die Nummer nicht passt."""
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text("\n")
    text_flat = re.sub(r"\s+", " ", text)
    target = norm(sku)

    numbers = re.findall(r"Herstellernr\.?\s*([A-Za-z0-9][A-Za-z0-9/._\-]*)", text_flat)
    if target not in {norm(n) for n in numbers}:
        return None

    h1 = soup.find("h1")
    name = h1.get_text(" ", strip=True) if h1 else ""
    maker = ""
    maker_link = soup.find("a", href=re.compile(r"CompanyHomepage\.asp"))
    if maker_link:
        maker = maker_link.get_text(" ", strip=True)

    # Herstellernr. der aktuell angezeigten Variante (steht unter den Varianten)
    shown = numbers[-1] if numbers else ""
    variant_row_price = None
    variant_link = None
    for tr in soup.find_all("tr"):
        row = re.sub(r"\s+", " ", tr.get_text(" "))
        m = re.search(r"Herstellernr\.?\s*([A-Za-z0-9][A-Za-z0-9/._\-]*)", row)
        if m and norm(m.group(1)) == target:
            pm = re.search(r"ab\s*" + PRICE_RE + r"\s*€", row)
            if pm:
                variant_row_price = parse_price(pm.group(1))
            a = tr.find("a", href=re.compile(r"Artikel\.asp"))
            if a:
                variant_link = urljoin(url, a["href"])
            break

    result = {
        "aera_name": name,
        "manufacturer": maker,
        "aera_url": url.split("&gRetURL")[0],
        "best_price": None,
        "best_unit": None,
        "best_supplier": None,
        "min_price": None,
        "max_price": None,
        "offers": None,
        "offers_total": None,
        "variant_from_price": variant_row_price,
        "_variant_link": variant_link if norm(shown) != target else None,
    }

    m = re.search(
        r"(\d+)\s*(?:\(von\s*(\d+)\)\s*)?Angebote?\s+zwischen\s+" + PRICE_RE + r"\s*€\s*und\s*" + PRICE_RE + r"\s*€",
        text_flat,
    )
    if m:
        result["offers"] = int(m.group(1))
        result["offers_total"] = int(m.group(2)) if m.group(2) else int(m.group(1))
        result["min_price"] = parse_price(m.group(3))
        result["max_price"] = parse_price(m.group(4))
    else:
        m = re.search(r"(\d+)\s+Angebote?\b", text_flat)
        if m:
            result["offers"] = int(m.group(1))

    # Günstigstes sichtbares Angebot: "34,15 € / Flasche 2,5 l" (AERA-Platzhalter 00,00 € ignorieren)
    for pm in re.finditer(PRICE_RE + r"\s*€\s*/\s*([^\n€]{1,40}?)(?=\s*\n|\s+\d+\s*%|$)", text):
        p = parse_price(pm.group(1))
        if p and p > 0:
            result["best_price"] = p
            result["best_unit"] = pm.group(2).strip()
            break
    supplier = soup.find("a", href=re.compile(r"BenutzerLieferant\.asp"))
    if supplier:
        result["best_supplier"] = supplier.get_text(" ", strip=True) or None

    if result["best_price"] is None:
        result["best_price"] = result["min_price"] or variant_row_price
    return result


def aera_lookup(session: requests.Session, sku: str) -> dict:
    url = AERA_SEARCH.format(q=quote(sku))
    r = get(session, url)
    final_url = r.url

    # Eindeutiger Treffer -> AERA leitet evtl. direkt auf die Produktseite
    if "Artikel.asp" in final_url:
        res = parse_aera_product(r.text, final_url, sku)
        if res:
            return finish_variant(session, res, sku)

    soup = BeautifulSoup(r.text, "html.parser")
    candidates: list[str] = []
    for a in soup.find_all("a", href=re.compile(r"Artikel\.asp\?gArtikelID=\d+")):
        m = re.search(r"gArtikelID=(\d+)", a["href"])
        if not m:
            continue
        link = f"{AERA_BASE}/Asps/Artikel.asp?gArtikelID={m.group(1)}"
        if link not in candidates:
            candidates.append(link)
    if not candidates:
        return {"status": "not_found"}

    for link in candidates[:MAX_CANDIDATES]:
        page = get(session, link)
        res = parse_aera_product(page.text, link, sku)
        if res:
            return finish_variant(session, res, sku)
    return {"status": "not_found", "candidates_checked": min(len(candidates), MAX_CANDIDATES)}


def finish_variant(session: requests.Session, res: dict, sku: str) -> dict:
    """Falls die Nummer eine andere Variante als die angezeigte ist, deren Seite nachladen."""
    link = res.pop("_variant_link", None)
    if link:
        try:
            page = get(session, link)
            sub = parse_aera_product(page.text, link, sku)
            if sub:
                sub.pop("_variant_link", None)
                res = sub
        except Exception as e:  # noqa: BLE001
            log(f"  Variante nicht ladbar ({e}), nutze 'ab'-Preis")
            res["best_price"] = res.get("variant_from_price") or res.get("best_price")
    res["status"] = "ok" if res.get("best_price") is not None else "no_price"
    return res


# --------------------------------------------------------------------------- #
# 3. Speichern
# --------------------------------------------------------------------------- #

def load_previous() -> dict:
    if not os.path.exists(PRICES_FILE):
        return {}
    try:
        with open(PRICES_FILE, encoding="utf-8") as f:
            data = json.load(f)
        return {norm(i["sku"]): i for i in data.get("items", [])}
    except Exception:  # noqa: BLE001
        return {}


# --------------------------------------------------------------------------- #
# 4. In Supabase schreiben (Spalten "AERA Preis € ohne Mwst.", "AERA Link", "AERA Stand")
# --------------------------------------------------------------------------- #

def sync_supabase(items: list[dict], now: str) -> None:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")
    if not url or not key:
        log("Supabase: SUPABASE_URL / SUPABASE_SERVICE_KEY nicht gesetzt – übersprungen.")
        return
    h = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    # Alle Artikelnummern laden und normalisiert zuordnen
    db: dict[str, str] = {}
    start = 0
    while True:
        r = requests.get(f"{url}/rest/v1/products?select=Artikelnummer",
                         headers={**h, "Range": f"{start}-{start + 999}"}, timeout=30)
        r.raise_for_status()
        rows = r.json()
        for row in rows:
            db.setdefault(norm(row["Artikelnummer"]), row["Artikelnummer"])
        if len(rows) < 1000:
            break
        start += 1000

    updated = missing = 0
    for it in items:
        if it["status"] == "error":
            continue  # technischer Fehler: alten Wert in der DB lassen
        art = db.get(norm(it["sku"]))
        if not art:
            missing += 1
            continue
        ok = it["status"] == "ok"
        body = {
            "AERA Preis € ohne Mwst.": it["best_price"] if ok else None,
            "AERA Link": it["aera_url"] if ok else None,
            "AERA Stand": now,
        }
        r = requests.patch(f"{url}/rest/v1/products?Artikelnummer=eq.{quote(art, safe='')}",
                           headers={**h, "Prefer": "return=minimal"}, data=json.dumps(body), timeout=30)
        if r.status_code >= 300:
            log(f"  Supabase-Fehler {art}: {r.status_code} {r.text[:200]}")
        else:
            updated += 1
    log(f"Supabase: {updated} Produkte aktualisiert, {missing} Artikelnummern nicht in der Tabelle.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="nur die ersten N Artikel (Test)")
    ap.add_argument("--sku", action="append", default=[], help="nur diese Nummer(n) prüfen")
    ap.add_argument("--debug", action="store_true", help="HTML von Fehlschlägen speichern")
    ap.add_argument("--refresh-skus", action="store_true",
                    help="Artikelnummern neu aus micro-dental.de lesen, data/aera-skus.txt schreiben und beenden")
    args = ap.parse_args()

    os.makedirs(DATA_DIR, exist_ok=True)
    session = requests.Session()
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    if args.refresh_skus:
        found = micro_dental_products(session)
        if not found:
            log("Keine Artikelnummern im Shop gefunden – Liste bleibt unverändert.")
            return 1
        write_skus(found)
        return 0

    if args.sku:
        products = [{"sku": s, "name": "", "url": None} for s in args.sku]
    else:
        products = load_skus()
    seen, unique = set(), []
    for p in products:
        if norm(p["sku"]) and norm(p["sku"]) not in seen:
            seen.add(norm(p["sku"]))
            unique.append(p)
    products = unique[: args.limit] if args.limit else unique
    if not products:
        log("Keine Artikelnummern gefunden – Abbruch, alte Daten bleiben erhalten.")
        return 1

    previous = load_previous()
    items, history_rows = [], []
    counts = {"ok": 0, "no_price": 0, "not_found": 0, "error": 0}

    for i, p in enumerate(products, 1):
        sku = p["sku"]
        log(f"[{i}/{len(products)}] {sku}")
        try:
            res = aera_lookup(session, sku)
        except Exception as e:  # noqa: BLE001
            res = {"status": "error", "error": str(e)[:200]}
        status = res.get("status", "error")
        counts[status] = counts.get(status, 0) + 1

        item = {
            "sku": sku,
            "name": p.get("name") or res.get("aera_name") or "",
            "micro_url": p.get("url"),
            "status": status,
            "checked_at": now,
            "aera_name": res.get("aera_name"),
            "manufacturer": res.get("manufacturer"),
            "aera_url": res.get("aera_url"),
            "best_price": res.get("best_price"),
            "best_unit": res.get("best_unit"),
            "best_supplier": res.get("best_supplier"),
            "min_price": res.get("min_price"),
            "max_price": res.get("max_price"),
            "offers": res.get("offers_total") or res.get("offers"),
            "price_updated_at": now if status == "ok" else None,
        }
        prev = previous.get(norm(sku))
        if status == "error" and prev and prev.get("best_price") is not None:
            # Bei technischen Fehlern letzten bekannten Preis behalten
            for k in ("aera_name", "manufacturer", "aera_url", "best_price", "best_unit",
                      "best_supplier", "min_price", "max_price", "offers", "price_updated_at"):
                item[k] = prev.get(k)
            item["stale"] = True
        items.append(item)
        log(f"   -> {status} {item.get('best_price')} € ({item.get('offers')} Angebote)")

        if status == "ok":
            history_rows.append([now[:10], sku, item["best_price"], item["min_price"], item["max_price"], item["offers"]])

        if args.debug and status in ("not_found", "no_price", "error"):
            os.makedirs(DEBUG_DIR, exist_ok=True)
            try:
                dbg = session.get(AERA_SEARCH.format(q=quote(sku)), headers=HEADERS, timeout=30)
                with open(os.path.join(DEBUG_DIR, f"{norm(sku)}.html"), "w", encoding="utf-8") as f:
                    f.write(dbg.text)
            except Exception:  # noqa: BLE001
                pass

    if args.sku or args.limit:
        # Testlauf: nichts überschreiben, nur ausgeben
        print(json.dumps(items, ensure_ascii=False, indent=2))
        log(f"Testlauf fertig: {counts}")
        return 0

    if counts["ok"] == 0:
        log(f"Kein einziger Preis gefunden ({counts}) – vermutlich hat AERA das Layout geändert. Alte Daten bleiben erhalten.")
        return 1

    out = {
        "updated_at": now,
        "source": "aera-online.de (öffentliche Preise, ohne Login)",
        "counts": counts,
        "items": sorted(items, key=lambda x: norm(x["sku"])),
    }
    with open(PRICES_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")

    new_file = not os.path.exists(HISTORY_FILE)
    with open(HISTORY_FILE, "a", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        if new_file:
            w.writerow(["date", "sku", "best_price", "min_price", "max_price", "offers"])
        w.writerows(history_rows)

    sync_supabase(items, now)
    log(f"Fertig: {counts}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
