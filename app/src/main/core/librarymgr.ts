// Správce knihovny Songs: procházení, vytváření složek, přejmenování, mazání
// (do koše), přesun a kopírování. Vše je bezpečně omezené na songsDir.

import { shell } from 'electron'
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, statSync } from 'fs'
import { basename, extname, join, resolve, sep } from 'path'
import { getConfig } from './config'

const SONG_MARKERS = ['song.ini', 'notes.chart', 'notes.mid']

export interface LibEntry {
  name: string
  type: 'dir' | 'file'
  isSong: boolean
}

function rootDir(): string {
  return resolve(getConfig().songsDir)
}

/** Bezpečně převede relativní cestu na absolutní uvnitř songsDir. */
function safeAbs(rel: string): string {
  const base = rootDir()
  const abs = resolve(base, rel || '.')
  if (abs !== base && !abs.startsWith(base + sep)) {
    throw new Error('Path is outside the Songs library')
  }
  return abs
}

function sanitizeName(name: string): string {
  const clean = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim()
  if (!clean || clean === '.' || clean === '..') throw new Error('Invalid name')
  return clean
}

function isSongDir(abs: string): boolean {
  try {
    const e = readdirSync(abs).map((x) => x.toLowerCase())
    return SONG_MARKERS.some((m) => e.includes(m))
  } catch {
    return false
  }
}

/** Unikátní cílová cesta (přidá " (2)" atd. před příponu u souboru). */
function uniqueDest(dir: string, name: string): string {
  let dest = join(dir, name)
  if (!existsSync(dest)) return dest
  const ext = extname(name)
  const stem = ext ? name.slice(0, -ext.length) : name
  let i = 2
  while (existsSync(join(dir, `${stem} (${i})${ext}`))) i++
  return join(dir, `${stem} (${i})${ext}`)
}

export function libList(rel: string): { path: string; entries: LibEntry[] } {
  const abs = safeAbs(rel)
  if (!existsSync(abs)) mkdirSync(abs, { recursive: true })
  let names: string[] = []
  try {
    names = readdirSync(abs)
  } catch {
    /* ignore */
  }
  const entries: LibEntry[] = []
  for (const name of names) {
    const full = join(abs, name)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) entries.push({ name, type: 'dir', isSong: isSongDir(full) })
    else if (st.isFile()) entries.push({ name, type: 'file', isSong: false })
  }
  entries.sort((a, b) =>
    a.type === b.type ? a.name.localeCompare(b.name, 'cs') : a.type === 'dir' ? -1 : 1
  )
  return { path: rel, entries }
}

export function libCreateFolder(rel: string, name: string): void {
  const abs = join(safeAbs(rel), sanitizeName(name))
  if (existsSync(abs)) throw new Error('A folder with that name already exists')
  mkdirSync(abs, { recursive: false })
}

export function libRename(relItem: string, newName: string): void {
  const src = safeAbs(relItem)
  const dest = join(safeAbs(''), relItem.split(/[\\/]/).slice(0, -1).join(sep), sanitizeName(newName))
  if (existsSync(dest)) throw new Error('An item with that name already exists')
  renameSync(src, dest)
}

export async function libTrash(relItem: string): Promise<void> {
  const abs = safeAbs(relItem)
  if (abs === rootDir()) throw new Error('Cannot delete the Songs root')
  await shell.trashItem(abs)
}

export function libMove(srcRelItem: string, destRelDir: string): void {
  const src = safeAbs(srcRelItem)
  const destDir = safeAbs(destRelDir)
  const dest = uniqueDest(destDir, basename(src))
  if (resolve(dest).startsWith(resolve(src) + sep)) {
    throw new Error('Cannot move a folder into itself')
  }
  try {
    renameSync(src, dest)
  } catch {
    // jiný disk → kopie + smazání originálu
    cpSync(src, dest, { recursive: true })
    void shell.trashItem(src)
  }
}

export function libCopy(srcRelItem: string, destRelDir: string): void {
  const src = safeAbs(srcRelItem)
  const destDir = safeAbs(destRelDir)
  const dest = uniqueDest(destDir, basename(src))
  cpSync(src, dest, { recursive: true })
}

export function libOpen(rel: string): void {
  void shell.openPath(safeAbs(rel))
}

export function libReveal(relItem: string): void {
  shell.showItemInFolder(safeAbs(relItem))
}
