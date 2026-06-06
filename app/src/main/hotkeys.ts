// Globální klávesové zkratky (fungují i když je fokus ve hře).

import { globalShortcut } from 'electron'
import { getConfig } from './core/config'
import { getOverlay, toggleOverlay } from './overlay'

/** Akcelerátor smí obsahovat jen ASCII znaky + standardní tokeny (CommandOrControl, Shift, …). */
function isValidAccelerator(accel: string): boolean {
  if (!accel) return false
  // Electron umí jen ASCII printable + speciální tokeny. Diakritika, §, °, … padají.
  return /^[\x20-\x7e]+$/.test(accel)
}

/** Bezpečná registrace – neplatný akcelerátor (překlep uživatele) nesmí shodit appku. */
function safeRegister(accelerator: string, cb: () => void): void {
  if (!accelerator) return
  if (!isValidAccelerator(accelerator)) {
    console.warn(
      `Zkratka "${accelerator}" obsahuje neplatné znaky (jen ASCII). Přeskočeno.`
    )
    return
  }
  try {
    globalShortcut.register(accelerator, cb)
  } catch (err) {
    console.warn(`Nepodařilo se zaregistrovat zkratku "${accelerator}":`, err)
  }
}

export function registerHotkeys(): void {
  globalShortcut.unregisterAll()
  const { hotkeys } = getConfig()
  safeRegister(hotkeys.toggleOverlay, () => toggleOverlay())
}

/** Pošle akci do renderer procesu (pro klávesovou navigaci v overlayi). */
export function sendHotkey(action: string): void {
  getOverlay()?.webContents.send('hotkey', action)
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll()
}
