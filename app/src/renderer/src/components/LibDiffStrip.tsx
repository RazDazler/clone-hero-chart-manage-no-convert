import type { InstrumentDifficulties } from '../../../shared/types'
import { INSTRUMENTS, MAX_DIFFICULTY } from '../utils'
import { Icon } from './Icon'

/** Kompaktní pruh obtížností pro řádek knihovny: jen nacharované nástroje (ikona + tečky). */
export function LibDiffStrip({ difficulties }: { difficulties: InstrumentDifficulties }): JSX.Element {
  const charted = INSTRUMENTS.filter((i) => (difficulties[i.id] ?? 0) > 0)
  if (charted.length === 0) return <span className="libdiff libdiff--none">—</span>
  return (
    <span className="libdiff">
      {charted.map((inst) => {
        const v = difficulties[inst.id] ?? 0
        return (
          <span className="libdiff__inst" key={inst.id} title={`${inst.label}: ${v}/${MAX_DIFFICULTY}`}>
            <Icon name={inst.icon} size={13} color={inst.color} />
            <span className="libdiff__dots">
              {Array.from({ length: MAX_DIFFICULTY }).map((_, i) => (
                <span
                  key={i}
                  className="libdiff__dot"
                  style={i < v ? { background: inst.color } : undefined}
                />
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}
