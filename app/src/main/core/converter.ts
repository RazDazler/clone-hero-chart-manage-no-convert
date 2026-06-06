// Konverze CON/.rb3con → Clone Hero formát přes Onyx Music Game Toolkit (CLI).
//
// Onyx (https://github.com/mtolly/onyx) je purpose-built CLI konvertor.
// Postup:
//   1) onyx import <CON> --to <projDir>      → vytvoří projekt se song.yml
//   2) do song.yml se přidá Phase Shift target (`ps`), pokud chybí
//   3) onyx build <projDir>/song.yml --target ps --to <outDir>
//      → výstup je složka se song.ini + notes.mid + album.png + audio (.ogg),
//        kterou Clone Hero přečte přímo.

import { existsSync, mkdtempSync, readFileSync, rmSync, appendFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { getConfig } from './config'
import { run } from './proc'

export interface ConvertProgress {
  progress: number
  message?: string
}

export function converterAvailable(): boolean {
  return existsSync(getConfig().onyxPath)
}

/** Zajistí, že song.yml má Phase Shift target. */
function ensurePsTarget(songYml: string): void {
  const content = readFileSync(songYml, 'utf-8')
  // Hledáme `ps:` target uvnitř bloku targets.
  if (/^\s{2}ps:\s*$/m.test(content)) return
  appendFileSync(songYml, '\n  ps:\n    game: ps\n', 'utf-8')
}

/**
 * Zkonvertuje jeden CON soubor do CH formátu. Výsledná píseň se zapíše přímo
 * do `outDir` (album.png, notes.mid, song.ini, *.ogg).
 */
export async function convertCon(
  inputPath: string,
  outDir: string,
  onProgress?: (p: ConvertProgress) => void
): Promise<void> {
  const onyx = getConfig().onyxPath
  if (!existsSync(onyx)) {
    throw new Error(
      `Onyx (onyx.exe) not found (${onyx}). Download the Onyx CLI or set the path in Settings.`
    )
  }

  // Onyx import si cílový adresář vytváří sám → předáme NEexistující podsložku
  // uvnitř dočasného rodiče (mkdtemp jen ten rodič).
  const parentDir = mkdtempSync(join(tmpdir(), 'onyx-'))
  const projDir = join(parentDir, 'proj')
  try {
    // 1) Import
    onProgress?.({ progress: -1, message: 'Importing CON…' })
    const imp = await run(onyx, ['import', inputPath, '--to', projDir])
    if (imp.code !== 0) {
      throw new Error(`Onyx import failed (code ${imp.code}): ${imp.stderr || imp.stdout}`)
    }

    const songYml = join(projDir, 'song.yml')
    if (!existsSync(songYml)) {
      throw new Error('Onyx import did not create song.yml (possibly an unsupported file)')
    }

    // 2) Phase Shift target
    ensurePsTarget(songYml)

    // 3) Build → CH folder
    onProgress?.({ progress: -1, message: 'Generating chart and audio…' })
    const build = await run(
      onyx,
      ['build', songYml, '--target', 'ps', '--to', outDir],
      (line, stream) => {
        if (stream === 'stdout' && /writing audio|finished/i.test(line)) {
          onProgress?.({ progress: -1, message: line.trim().slice(0, 80) })
        }
      }
    )
    if (build.code !== 0) {
      throw new Error(`Onyx build failed (code ${build.code}): ${build.stderr || build.stdout}`)
    }
  } finally {
    try {
      if (existsSync(parentDir)) rmSync(parentDir, { recursive: true, force: true })
    } catch {
      /* úklid best-effort */
    }
  }
}
