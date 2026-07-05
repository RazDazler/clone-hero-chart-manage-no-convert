import { useStore } from '../store'
import { QUICK_PICKS } from '../utils'
import { Icon } from './Icon'

/**
 * Prázdný stav „nevím, co hledat": tlačítko Surprise me (náhodné charty) +
 * chipy s populárními kapelami jako vstupní body do databáze.
 */
export function Discover(): JSX.Element {
  const surprise = useStore((s) => s.surprise)
  const pickSearch = useStore((s) => s.pickSearch)
  return (
    <div className="discover">
      <button
        type="button"
        className="btn-primary discover__surprise"
        onClick={() => void surprise()}
        title="Load a handful of random charts"
      >
        <Icon name="refresh" size={16} />
        Surprise me
      </button>
      <span className="discover__hint">or jump into a popular artist</span>
      <div className="discover__chips">
        {QUICK_PICKS.map((term) => (
          <button
            key={term}
            type="button"
            className="pickchip"
            onClick={() => void pickSearch(term)}
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  )
}
