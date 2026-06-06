// Parsování formátů souborů z RhythmVerse a rozhodnutí, zda je potřeba konverze.
//
// RhythmVerse vrací `gameformats` jako PHP-serializovaný seznam, např.:
//   a:1:{i:0;s:7:"rb3xbox";}
// Pole `file.gameformat` je naopak čistý kód (např. "rb3xbox").

/** Vytáhne všechny řetězcové hodnoty z PHP-serializovaného pole. */
export function parsePhpStringArray(serialized: string | null | undefined): string[] {
  if (!serialized || typeof serialized !== 'string') return []
  const out: string[] = []
  // s:<len>:"<value>"
  const re = /s:\d+:"([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(serialized)) !== null) {
    if (m[1]) out.push(m[1])
  }
  return out
}

/**
 * Formáty, které Clone Hero přečte přímo (jen rozbalit a nakopírovat).
 * - clonehero / ch / chart : nativní CH (.chart)
 * - ps : Phase Shift (notes.mid + song.ini) — CH to čte
 * - sng : zabalený CH formát
 */
const NATIVE_FORMATS = new Set(['clonehero', 'ch', 'chart', 'ps', 'phaseshift', 'sng', 'raw'])

/** Klasifikuje jeden formát: vrací true, pokud je potřeba konverze přes ChConvert. */
export function formatNeedsConversion(format: string | null | undefined): boolean {
  if (!format) return false
  const f = format.toLowerCase().trim()
  if (NATIVE_FORMATS.has(f)) return false
  // Rock Band / Guitar Hero CON balíčky a další konzolové formáty → konverze.
  // rb3xbox, rb3ps3, rb3wii, rb2xbox, rbn, con, rba, ghwt, ...
  if (
    f.startsWith('rb') ||
    f.startsWith('gh') ||
    f.includes('con') ||
    f.includes('xbox') ||
    f.includes('ps3') ||
    f.includes('wii') ||
    f === 'rba'
  ) {
    return true
  }
  // Neznámý formát: raději nekonvertovat (zkusit jako native).
  return false
}

/** Vrátí true, pokud aspoň jeden z formátů vyžaduje konverzi. */
export function anyNeedsConversion(formats: string[]): boolean {
  return formats.some(formatNeedsConversion)
}

/** Lidsky čitelný štítek formátu pro UI. */
export function formatLabel(format: string | null | undefined): string {
  if (!format) return '?'
  const map: Record<string, string> = {
    rb3xbox: 'RB3 (Xbox)',
    rb3ps3: 'RB3 (PS3)',
    rb3wii: 'RB3 (Wii)',
    rb2xbox: 'RB2 (Xbox)',
    clonehero: 'Clone Hero',
    ch: 'Clone Hero',
    chart: 'Clone Hero',
    ps: 'Phase Shift',
    phaseshift: 'Phase Shift',
    sng: 'SNG',
    rba: 'RBA'
  }
  return map[format.toLowerCase()] ?? format
}
