import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

interface Props {
  value: number
  options: number[]
  disabled?: boolean
  onChange: (v: number) => void
  ariaLabel?: string
}

/** Malý vlastní dropdown (tmavý, čitelný) – náhrada za nestylovatelný <select>. */
export function Dropdown({ value, options, disabled, onChange, ariaLabel }: Props): JSX.Element {
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

  return (
    <div className={`dd ${open ? 'dd--open' : ''}`} ref={ref}>
      <button
        type="button"
        className="dd__btn"
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{value}</span>
        <Icon name="caret" size={11} className="dd__caret" />
      </button>
      {open && !disabled ? (
        <ul className="dd__menu" role="listbox">
          {options.map((o) => (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={o === value}
                className={`dd__item ${o === value ? 'dd__item--sel' : ''}`}
                onClick={() => {
                  onChange(o)
                  setOpen(false)
                }}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
