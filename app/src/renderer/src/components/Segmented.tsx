import { useLayoutEffect, useRef, useState } from 'react'

export interface SegOption<T extends string> {
  id: T
  label: string
  hint?: string
}

interface SegmentedProps<T extends string> {
  options: SegOption<T>[]
  value: T
  onChange: (id: T) => void
  /** 'db' = teal→violet akcent (Database), jinak hlavní violet→pink (System). */
  variant?: 'db' | 'system'
}

/**
 * Segmentový přepínač s klouzavým indikátorem.
 * Aktivní „pilulka" plynule přejíždí mezi položkami (měří se přes offsetLeft/Width
 * aktivního tlačítka — položky mají různou šířku, takže čistě CSS to nejde).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  variant = 'system'
}: SegmentedProps<T>): JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const active = wrap.querySelector<HTMLElement>('.seg__btn--active')
    if (!active) {
      setPill(null)
      return
    }
    setPill({ left: active.offsetLeft, width: active.offsetWidth })
  }, [value, options])

  return (
    <div className={`seg ${variant === 'db' ? 'seg--db' : ''}`} ref={wrapRef}>
      {pill ? (
        <span
          className="seg__pill"
          style={{ transform: `translateX(${pill.left}px)`, width: pill.width }}
        />
      ) : null}
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`seg__btn ${value === o.id ? 'seg__btn--active' : ''}`}
          title={o.hint}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
