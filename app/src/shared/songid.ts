/**
 * Odvození klíčů identity písně — JEDEN zdroj pravdy sdílený main i rendererem.
 *
 * Historicky žila tatáž logika okopírovaná na čtyřech místech (utils `songKey`,
 * library `normKey`, duplicates `norm`, both-merge klíč v ipc i store). Když se
 * jedna kopie změnila a ostatní ne, „už mám v knihovně" nebo dedup přestaly sedět.
 * Cokoli, co porovnává písně podle jména, má teď vycházet odsud.
 */
import type { SongResult, SortKey } from './types'

/** Normalizace textu na porovnání: malá písmena, jen alfanumerika. */
export function normText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Klíč „stejná píseň bez ohledu na verzi": `artist|title` (alfanum, lowercase).
 * Slouží k párování s knihovnou („In library") a k dedupu duplicit.
 * POZOR: main `normKey` i renderer `songKey` MUSÍ vracet totéž — proto oba sem.
 */
export function songKey(artist: string, title: string): string {
  return `${normText(artist)}|${normText(title)}`
}

/**
 * Klíč „konkrétní chart" pro merge dvou databází v režimu „Both": rozlišuje i
 * charter (jiný charter = jiný chart), ale toleruje drobné rozdíly velikosti/mezer.
 * Jemnější než `songKey` — nechce sloučit dvě různé verze do jedné.
 */
export function mergeKey(s: SongResult): string {
  const t = (v: string): string => v.trim().toLowerCase()
  return `${t(s.artist)}|${t(s.title)}|${t(s.charter ?? '')}`
}

/**
 * Sloučí výsledky RhythmVerse + Encore pro režim „Both" a odduplikuje je podle
 * [[mergeKey]]. Pořadí: normálně Encore první (přímý `.sng` hosting bývá
 * spolehlivější než scrape Google Drive), VÝJIMKA u „Most downloaded" — Encore
 * počet stažení nemá (řadil by se náhodně), tak jde napřed RhythmVerse.
 *
 * POZOR: main (ipc.ts, mělká stránka) i renderer (store.ts, hluboká „Both" přes
 * chunky) MUSÍ slučovat STEJNĚ, jinak by se pořadí mezi mělkými a hlubokými
 * stránkami rozešlo — proto to žije jen tady.
 */
export function mergeBoth(
  rvSongs: SongResult[],
  enSongs: SongResult[],
  sort?: SortKey
): SongResult[] {
  const ordered = sort === 'downloads' ? [...rvSongs, ...enSongs] : [...enSongs, ...rvSongs]
  const seen = new Set<string>()
  const out: SongResult[] = []
  for (const s of ordered) {
    const k = mergeKey(s)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(s)
  }
  return out
}
