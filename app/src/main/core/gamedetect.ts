// Detekce běžící hry Clone Hero + její spuštění / přepnutí do popředí.
//
// Implementace je Windows-only (CH na Linuxu/macOS nemá oficiální build,
// takže to nemá smysl portovat).

import { exec, execFile, spawn } from 'child_process'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { promisify } from 'util'
import { getConfig } from './config'

const execAsync = promisify(exec)

const PROCESS_NAME = 'Clone Hero.exe'

/** Vrátí cestu k Clone Hero.exe (manuální override z configu má přednost). */
export function detectChExe(): string | null {
  const cfg = getConfig()
  // 1) Manuální override v configu, pokud uživatel zadal.
  if (cfg.chExePath && existsSync(cfg.chExePath)) return cfg.chExePath
  // 2) Auto-detekce odvozením z songsDir: typicky `…/Clone Hero/Songs`.
  if (cfg.songsDir) {
    const parent = dirname(cfg.songsDir)
    const candidate = join(parent, 'Clone Hero.exe')
    if (existsSync(candidate)) return candidate
  }
  // 3) Známé fallback cesty.
  for (const p of [
    'G:\\Clone Hero\\Clone Hero.exe',
    'C:\\Program Files\\Clone Hero\\Clone Hero.exe',
    'C:\\Program Files (x86)\\Clone Hero\\Clone Hero.exe',
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Clone Hero\\Clone Hero.exe',
    'C:\\Clone Hero\\Clone Hero.exe'
  ]) {
    if (existsSync(p)) return p
  }
  return null
}

/** Stav detekce CH.exe — pro UI rozhodnutí, zda ukázat pole pro manuální cestu. */
export function chExeStatus(): { path: string | null; autoDetected: boolean } {
  const cfg = getConfig()
  const manual = cfg.chExePath && existsSync(cfg.chExePath)
  if (manual) return { path: cfg.chExePath, autoDetected: false }
  const auto = detectChExe()
  return { path: auto, autoDetected: auto !== null }
}

/** Zjistí, jestli proces hry právě běží (Windows tasklist). */
export async function isGameRunning(): Promise<boolean> {
  if (process.platform !== 'win32') return false
  try {
    const { stdout } = await execAsync(
      `tasklist /NH /FO CSV /FI "IMAGENAME eq ${PROCESS_NAME}"`,
      { windowsHide: true, timeout: 4000 }
    )
    return stdout.toLowerCase().includes(PROCESS_NAME.toLowerCase())
  } catch {
    return false
  }
}

/** Spustí Clone Hero.exe (detach), aby app nečekala na konec hry. */
export function launchGame(): { ok: true } | { ok: false; error: string } {
  const exe = detectChExe()
  if (!exe) {
    return {
      ok: false,
      error:
        "Couldn't find Clone Hero.exe. Set the correct Songs folder in Settings (Clone Hero.exe is its parent)."
    }
  }
  try {
    const child = spawn(exe, [], {
      cwd: dirname(exe),
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    })
    child.unref()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Pokud hra běží, přepne ji do popředí (Win32 SetForegroundWindow přes PowerShell).
 * Pokud neběží, spustí ji.
 */
export async function bringGameToFront(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'Only supported on Windows.' }
  }
  const running = await isGameRunning()
  if (!running) return launchGame()

  // Najdi hlavní okno procesu a přepni ho dopředu.
  // Add-Type definuje Win32 wrappery; ShowWindow(9) = SW_RESTORE (z minimalizace).
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -Name W -Namespace U -MemberDefinition '
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(System.IntPtr h, int n);
' | Out-Null
$p = Get-Process -Name 'Clone Hero' | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($p) {
  [U.W]::ShowWindowAsync($p.MainWindowHandle, 9) | Out-Null
  [U.W]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
}
`.trim()
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, timeout: 4000 },
      (err) => {
        if (err) resolve({ ok: false, error: err.message })
        else resolve({ ok: true })
      }
    )
  })
}
