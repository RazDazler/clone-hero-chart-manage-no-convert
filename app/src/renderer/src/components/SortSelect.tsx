import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import type { SortKey } from '../store'
import { Icon } from './Icon'

const OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'relevance', label: 'Default' },
  { id: 'title', label: 'Title (A–Z)' },
  { id: 'artist', label: 'Artist (A–Z)' },
  { id: 'length', label: 'Length' }
]

export function SortSelect(): JSX.Element {
  const sort = useStore((s) => s.sort)
  const setSort = useStore((s) => s.setSort)
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

  const current = OPTIONS.find((o) => o.id === sort) ?? OPTIONS[0]

  return (
    <div className="dd dd--sort" ref={ref}>
      <button type="button" className="dd__btn" onClick={() => setOpen((o) => !o)}>
        <span>{current.label}</span>
        <Icon name="caret" size={11} className="dd__caret" />
      </button>
      {open ? (
        <ul className="dd__menu" role="listbox">
          {OPTIONS.map((o) => (
            <li key={o.id}>
              <button
                type="button"
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
