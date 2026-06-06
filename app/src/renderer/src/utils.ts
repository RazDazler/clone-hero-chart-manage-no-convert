import type { InstrumentDifficulties } from '../../shared/types'
import type { IconName } from './components/Icon'

export function formatLength(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '–'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatLabel(format: string | null): string {
  if (!format) return '?'
  const map: Record<string, string> = {
    rb3xbox: 'RB3',
    rb3ps3: 'RB3 PS3',
    rb3wii: 'RB3 Wii',
    rb2xbox: 'RB2',
    clonehero: 'Clone Hero',
    ch: 'Clone Hero',
    chart: 'Clone Hero',
    ps: 'Phase Shift',
    phaseshift: 'Phase Shift',
    sng: 'SNG',
    rba: 'RBA'
  }
  return map[format.toLowerCase()] ?? format.toUpperCase()
}

export interface InstrumentMeta {
  id: keyof InstrumentDifficulties
  label: string
  short: string
  icon: IconName
  color: string
}

/** Pořadí a vzhled nástrojů v UI (jako RhythmVerse). */
export const INSTRUMENTS: InstrumentMeta[] = [
  { id: 'guitar', label: 'Guitar', short: 'G', icon: 'guitar', color: '#ff5b5b' },
  { id: 'bass', label: 'Bass', short: 'B', icon: 'bass', color: '#4a90e2' },
  { id: 'drums', label: 'Drums', short: 'D', icon: 'drums', color: '#f5c518' },
  { id: 'keys', label: 'Keys', short: 'K', icon: 'keys', color: '#d23bd2' },
  { id: 'vocals', label: 'Vocals', short: 'V', icon: 'vocals', color: '#2dd4bf' }
]

export const MAX_DIFFICULTY = 6
