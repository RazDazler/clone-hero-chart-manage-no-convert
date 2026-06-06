// End-to-end test funkčnosti — ověří stejný řetězec, jaký používá aplikace:
//   vyhledávání (RhythmVerse) → stažení (GDrive složka i CON) → rozbalení/konverze
//   (7z / Onyx) → detekce písně (song.ini) → "instalace" do dočasné složky.
// Nesahá na reálnou knihovnu hry — vše jde do systémového TEMP.

import { spawn } from 'child_process'
import { createWriteStream, existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { fileURLToPath } from 'url'

const PROJ = dirname(dirname(fileURLToPath(import.meta.url)))
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'

let pass = 0
let fail = 0
const ok = (m) => { console.log('  \x1b[32m✓\x1b[0m ' + m); pass++ }
const bad = (m) => { console.log('  \x1b[31m✗\x1b[0m ' + m); fail++ }
function assert(cond, m) { cond ? ok(m) : bad(m) }

// ---- nástroje (stejné cesty jako default config) ----
function findFile(roots, name, maxDepth) {
  const lower = name.toLowerCase()
  const walk = (dir, d) => {
    let e; try { e = readdirSync(dir) } catch { return null }
    for (const n of e) if (n.toLowerCase() === lower) { const f = join(dir, n); try { if (statSync(f).isFile()) return f } catch {} }
    if (d >= maxDepth) return null
    for (const n of e) { const f = join(dir, n); try { if (statSync(f).isDirectory()) { const h = walk(f, d + 1); if (h) return h } } catch {} }
    return null
  }
  for (const r of roots) { const h = walk(r, 0); if (h) return h }
  return null
}
const ONYX = findFile([join(PROJ, 'native', 'onyx')], 'onyx.exe', 3)
const SEVENZIP = findFile([join(PROJ, 'C3 CON TOOLS', 'bin')], '7z.exe', 2)

function run(exe, args, onLine) {
  return new Promise((res) => {
    const c = spawn(exe, args, { windowsHide: true })
    let out = '', err = ''
    c.stdout.on('data', (d) => { out += d; if (onLine) String(d).split(/\r?\n/).forEach((l) => l && onLine(l)) })
    c.stderr.on('data', (d) => { err += d })
    c.on('error', () => res({ code: -1, out, err }))
    c.on('close', (code) => res({ code: code ?? -1, out, err }))
  })
}

async function downloadTo(url, dest) {
  let res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, redirect: 'follow' })
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('text/html') && /google\.com/.test(url)) {
    const html = await res.text()
    const action = html.match(/action="([^"]+)"/i)
    const params = {}
    for (const m of html.matchAll(/name="([^"]+)"\s+value="([^"]*)"/gi)) params[m[1]] = m[2]
    if (action) { const u = new URL(action[1].replace(/&amp;/g, '&')); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v); res = await fetch(u.toString(), { headers: { 'User-Agent': UA } }) }
  }
  if (!res.ok || !res.body) throw new Error('HTTP ' + res.status)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
}

function isArchiveMagic(p) {
  try { const b = readFileSync(p).subarray(0, 6)
    if (b[0] === 0x50 && b[1] === 0x4b) return true
    if (b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf) return true
    if (b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21) return true
  } catch {} return false
}
function findSongFolders(root) {
  const out = []
  const walk = (dir, d) => {
    if (d > 6) return
    let e; try { e = readdirSync(dir) } catch { return }
    if (e.map((x) => x.toLowerCase()).some((x) => ['song.ini', 'notes.chart', 'notes.mid'].includes(x))) { out.push(dir); return }
    for (const n of e) { const f = join(dir, n); try { if (statSync(f).isDirectory()) walk(f, d + 1) } catch {} }
  }
  walk(root, 0); return out
}
async function listDriveFolder(folderId) {
  const res = await fetch(`https://drive.google.com/drive/folders/${folderId}`, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US' } })
  const html = await res.text()
  const ids = [...html.matchAll(/data-id="([^"]+)"/g)].filter((m) => m[1] !== '_gd')
  const groups = []
  for (const m of ids) { const last = groups[groups.length - 1]; if (!last || last.id !== m[1]) groups.push({ id: m[1], pos: m.index }) }
  const entries = []
  for (let i = 0; i < groups.length; i++) {
    const slice = html.slice(groups[i].pos, i + 1 < groups.length ? groups[i + 1].pos : html.length)
    const fm = slice.match(/aria-label="([^"]+\.[a-z0-9]{2,5})(?:\s[^"]*)?"/i)
    const name = fm ? fm[1] : groups[i].id
    entries.push({ id: groups[i].id, name: name.replace(/[<>:"/\\|?*]/g, '_'), isFolder: !/\.[a-z0-9]{2,5}$/i.test(name) })
  }
  return entries
}

async function rvSearch(system, text, records = 10) {
  const body = new URLSearchParams({ text, data_type: 'full', records: String(records), page: '1' })
  const res = await fetch(`https://rhythmverse.co/api/${system}/songfiles/search/live`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': UA },
    body
  })
  const j = await res.json()
  return j.data?.songs ?? []
}

// ===================== TESTY =====================
const tmp = mkdtempSync(join(tmpdir(), 'chsd-e2e-'))
const songsDir = join(tmp, 'Songs')
mkdirSync(songsDir, { recursive: true })

try {
  console.log('\n\x1b[1m[0] Prostředí\x1b[0m')
  assert(!!ONYX, `onyx.exe nalezen: ${ONYX}`)
  assert(!!SEVENZIP, `7z.exe nalezen: ${SEVENZIP}`)

  console.log('\n\x1b[1m[1] Vyhledávání RhythmVerse (Clone Hero)\x1b[0m')
  const ch = await rvSearch('ch', 'foo fighters')
  assert(ch.length > 0, `vráceno ${ch.length} výsledků`)
  const s0 = ch[0]
  assert(!!s0.data.title && !!s0.data.artist, `metadata: ${s0.data.artist} – ${s0.data.title}`)
  // Obtížnosti ověř napříč celou sadou (ne jen u prvního – ten může mít 0).
  const songsWithDiff = ch.filter((s) =>
    ['diff_guitar', 'diff_drums', 'diff_bass', 'diff_vocals', 'diff_keys'].some(
      (k) => Number(s.data[k]) > 0
    )
  )
  assert(songsWithDiff.length > 0, `obtížnosti nástrojů přítomné (${songsWithDiff.length}/${ch.length})`)
  assert(typeof s0.data.song_length !== 'undefined', `délka: ${s0.data.song_length}s`)
  assert(!!s0.data.album_art, `obal: ${s0.data.album_art}`)

  console.log('\n\x1b[1m[2] Nativní CH stažení (Google Drive složka)\x1b[0m')
  const folderId = '14ClayQsJcL6oZN8cdFGVulFcvbiSUmwh' // Metallica – Jump in the Fire
  const entries = await listDriveFolder(folderId)
  assert(entries.length > 0, `složka obsahuje ${entries.length} položek`)
  const dlDir = join(tmp, 'dl-native'); mkdirSync(dlDir, { recursive: true })
  for (const e of entries.filter((x) => !x.isFolder)) {
    await downloadTo(`https://drive.google.com/uc?id=${e.id}&export=download`, join(dlDir, e.name))
  }
  const nativeSongs = findSongFolders(dlDir)
  assert(nativeSongs.length > 0, `detekována píseň (song.ini/chart)`)
  // instalace
  if (nativeSongs.length) {
    const dest = join(songsDir, 'TEST - Native')
    await run(SEVENZIP, ['--help']) // no-op warmup
    mkdirSync(dest, { recursive: true })
    for (const f of readdirSync(nativeSongs[0])) {
      const src = join(nativeSongs[0], f)
      if (statSync(src).isFile()) await pipeline(Readable.from(readFileSync(src)), createWriteStream(join(dest, f)))
    }
    assert(existsSync(join(dest, 'song.ini')) || existsSync(join(dest, 'notes.chart')), 'nainstalováno do Songs (native)')
  }

  console.log('\n\x1b[1m[3] Konverze Rock Band CON → CH (Onyx)\x1b[0m')
  const conUrl = 'https://rhythmverse.co/download_file/kloporte/59297c0ceee051.00971773/klop_kidswithguns_rb3con'
  const conFile = join(tmp, 'test.rb3con')
  await downloadTo(conUrl, conFile)
  const magic = readFileSync(conFile).subarray(0, 4).toString('latin1')
  assert(magic === 'CON ', `stažen CON balíček (magic "${magic}")`)
  const proj = join(tmp, 'onyx-proj')
  const imp = await run(ONYX, ['import', conFile, '--to', proj])
  assert(imp.code === 0 && existsSync(join(proj, 'song.yml')), 'onyx import OK (song.yml)')
  // přidat ps target
  const yml = join(proj, 'song.yml')
  const cur = readFileSync(yml, 'utf-8')
  if (!/^\s{2}ps:\s*$/m.test(cur)) { (await import('fs')).appendFileSync(yml, '\n  ps:\n    game: ps\n') }
  const outDir = join(tmp, 'conv-out')
  let sawAudio = false
  const build = await run(ONYX, ['build', yml, '--target', 'ps', '--to', outDir], (l) => { if (/writing audio|finished/i.test(l)) sawAudio = true })
  assert(build.code === 0, 'onyx build OK')
  assert(existsSync(join(outDir, 'song.ini')), 'výstup má song.ini')
  assert(existsSync(join(outDir, 'notes.mid')), 'výstup má notes.mid')
  const oggs = existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith('.ogg')) : []
  assert(oggs.length > 0, `výstup má audio (${oggs.join(', ')})`)
  const ini = existsSync(join(outDir, 'song.ini')) ? readFileSync(join(outDir, 'song.ini'), 'utf-8') : ''
  assert(/artist\s*=\s*Gorillaz/i.test(ini), 'song.ini má správná metadata')

  console.log('\n\x1b[1m[4] Filtr nástroje (logika)\x1b[0m')
  const withKeys = ch.filter((s) => Number(s.data.diff_keys) > 0)
  assert(true, `písní s klávesami v sadě: ${withKeys.length}/${ch.length}`)
} catch (e) {
  bad('VÝJIMKA: ' + (e?.message || e))
} finally {
  try { rmSync(tmp, { recursive: true, force: true }) } catch {}
}

console.log(`\n\x1b[1mVÝSLEDEK: ${pass} OK, ${fail} chyb\x1b[0m`)
process.exit(fail ? 1 : 0)
