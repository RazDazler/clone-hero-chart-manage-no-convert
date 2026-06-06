import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SongResult } from '../../../shared/types'
import { useStore } from '../store'
import { Icon } from './Icon'

const MENU_WIDTH = 200
const MENU_GAP = 6

/** Kontextové ⋮ menu u řádku skladby.
 *
 *  Renderuje se přes React portal do document.body, takže:
 *   - nezávisí na overflow/clipping rodičů (řádek, .results scroller, …),
 *   - nemá stacking context konflikty s tlačítky sousedních řádků,
 *   - drží se vždy nad vším ostatním.
 */
export function RowMenu({ song }: { song: SongResult }): JSX.Element {
  const openKey = useStore((s) => s.openRowMenu)
  const setOpenKey = useStore((s) => s.setOpenRowMenu)
  const open = openKey === song.key

  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Spočítá pozici menu z bounding rectu ⋮ tlačítka. Když uživatel scrolluje,
  // zavřeme menu úplně (jednodušší než resync pozice).
  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const update = (): void => {
      const r = btnRef.current?.getBoundingClientRect()
      if (!r) return
      const top = Math.min(window.innerHeight - 200, r.bottom + MENU_GAP)
      const left = Math.max(8, r.right - MENU_WIDTH)
      setPos({ top, left })
    }
    update()
    const close = (): void => setOpenKey(null)
    window.addEventListener('resize', close)
    // Scroll v .results vyvolá native scroll na něm. Posloucháme capture, aby
    // zachytil i vnořené scrollery (.queue__list apod.).
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open, setOpenKey])

  const pageUrl = song.downloadPageUrl || song.downloadUrl
  const link = song.downloadUrl || song.downloadPageUrl

  const stop = (e: React.MouseEvent): void => {
    e.stopPropagation()
  }

  const toggle = (e: React.MouseEvent): void => {
    e.stopPropagation()
    setOpenKey(open ? null : song.key)
  }

  const close = (): void => setOpenKey(null)

  const menu =
    open && pos
      ? createPortal(
          <>
            <div
              className="rowmenu__backdrop"
              onMouseDown={(e) => {
                e.stopPropagation()
                close()
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <div
              className="rowmenu__menu rowmenu__menu--portal"
              style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
              role="menu"
              onMouseDown={stop}
              onClick={stop}
            >
              {pageUrl ? (
                <button
                  className="rowmenu__item"
                  role="menuitem"
                  onClick={() => {
                    window.api.openExternal(pageUrl)
                    close()
                  }}
                >
                  <Icon name="globe" size={15} /> Open page in browser
                </button>
              ) : null}
              {link ? (
                <button
                  className="rowmenu__item"
                  role="menuitem"
                  onClick={() => {
                    void navigator.clipboard?.writeText(link)
                    close()
                  }}
                >
                  <Icon name="link" size={15} /> Copy download link
                </button>
              ) : null}
              <button
                className="rowmenu__item"
                role="menuitem"
                onClick={() => {
                  void navigator.clipboard?.writeText(`${song.artist} - ${song.title}`)
                  close()
                }}
              >
                <Icon name="copy" size={15} /> Copy name
              </button>
            </div>
          </>,
          document.body
        )
      : null

  return (
    <div className="rowmenu" onMouseDown={stop} onClick={stop}>
      <button
        ref={btnRef}
        type="button"
        className="rowmenu__btn"
        title="More"
        onMouseDown={stop}
        onClick={toggle}
      >
        <Icon name="more" size={18} />
      </button>
      {menu}
    </div>
  )
}
