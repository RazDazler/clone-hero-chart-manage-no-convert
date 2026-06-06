import type { InstrumentDifficulties } from '../../../shared/types'
import { INSTRUMENTS, MAX_DIFFICULTY } from '../utils'
import { Icon } from './Icon'

interface Props {
  difficulties: InstrumentDifficulties
}

/** Sloupce nástrojů: ikona + popisek + řada teček v barvě nástroje (jako RhythmVerse). */
export function InstrumentDifficulty({ difficulties }: Props): JSX.Element {
  return (
    <div className="instruments">
      {INSTRUMENTS.map((inst) => {
        const value = difficulties[inst.id]
        const charted = value !== undefined && value > 0
        return (
          <div
            className={`instrument ${charted ? '' : 'instrument--absent'}`}
            key={inst.id}
            title={`${inst.label}: ${charted ? `${value}/${MAX_DIFFICULTY}` : 'not charted'}`}
          >
            <Icon
              name={inst.icon}
              size={18}
              color={inst.color}
              className="instrument__icon"
            />
            <span className="instrument__label">{inst.label}</span>
            <span className="dots">
              {Array.from({ length: MAX_DIFFICULTY }).map((_, i) => {
                const on = charted && i < (value ?? 0)
                return (
                  <span
                    key={i}
                    className={`dot ${on ? 'dot--on' : ''}`}
                    style={on ? { background: inst.color, boxShadow: `0 0 6px ${inst.color}77` } : undefined}
                  />
                )
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
