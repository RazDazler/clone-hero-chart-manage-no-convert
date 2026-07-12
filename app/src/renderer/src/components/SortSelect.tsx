import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import type { SortKey } from '../store'
import { Icon } from './Icon'

// `rvOnly`: RhythmVerse má počet stažení, Chorus Encore ne → v Encore režimu
// „Most downloaded" nezobrazujeme (nešlo by seřadit, jen by matlo).
// `hint`: tooltip vysvětlující volbu (uživatelé se ptali, co je „Default").
const OPTIONS: { id: SortKey; label: string; rvOnly?: boolean; hint: string }[] = [
  {
    id: 'relevance',
    label: 'Default',
    hint: 'The source order — best match when searching, or the catalogue’s own default when browsing'
  },
  { id: 'title', label: 'Title (A–Z)', hint: 'Alphabetical by song title' },
  { id: 'artist', label: 'Artist (A–Z)', hint: 'Alphabetical by artist' },
  {
    id: 'downloads',
    label: 'Most downloaded',
    rvOnly: true,
    hint: 'Most downloaded first (RhythmVerse download counts)'
  },
  { id: 'newest', label: 'Recently added', hint: 'Most recently added or updated first' },
  { id: 'length', label: 'Length', hint: 'Longest songs first' }
]

export function SortSelect(): JSX.Element {
  const sort = useStore((s) => s.sort)
  const setSort = useStore((s) => s.setSort)
  const database = useStore((s) => s.database)
  const options = OPTIONS.filter((o) => !o.rvOnly || database !== 'enchor')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const current = options.find((o) => o.id === sort) ?? options[0]

  return (
    <div className="dd dd--sort" ref={ref}>
      <button
        type="button"
        className="dd__btn"
        onClick={() => setOpen((o) => !o)}
        title={current.hint}
      >
        {/* Ve výchozím stavu ukaž „Sort by" (samotné „Default" mátlo — nikdo
            nevěděl, co reprezentuje); po výběru řazení jeho název. */}
        <span>{current.id === 'relevance' ? 'Sort by' : current.label}</span>
        <Icon name="caret" size={11} className="dd__caret" />
      </button>
      {open ? (
        <ul className="dd__menu" role="listbox">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                title={o.hint}
                className={`dd__item ${o.id === sort ? 'dd__item--sel' : ''}`}
                onClick={() => {
                  setSort(o.id)
                  setOpen(false)
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
