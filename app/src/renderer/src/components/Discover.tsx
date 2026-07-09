import { useStore } from '../store'
import { QUICK_PICKS } from '../utils'

/**
 * Prázdný stav „nevím, co hledat": chipy s populárními kapelami jako rychlé
 * vstupní body do databáze.
 */
export function Discover(): JSX.Element {
  const pickSearch = useStore((s) => s.pickSearch)
  return (
    <div className="discover">
      <span className="discover__hint">Jump into a popular artist</span>
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
