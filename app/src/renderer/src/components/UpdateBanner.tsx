import { useEffect, useState } from 'react'
import type { UpdateInfo } from '../../../shared/types'
import { Icon } from './Icon'

const DISMISS_KEY = 'chm.updateDismissed'

/**
 * Nenápadný pruh nahoře, když je na GitHubu novější verze.
 * Kontrola je tichá (offline/chyba = nic). Zavření se pamatuje per-verze,
 * takže stejná verze už znovu neotravuje.
 */
export function UpdateBanner(): JSX.Element | null {
  const [info, setInfo] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await window.api.checkUpdate()
        if (cancelled || !res || !res.hasUpdate) return
        // Uživatel už tuhle verzi zavřel? Pak nic neukazuj.
        if (localStorage.getItem(DISMISS_KEY) === res.latest) return
        setInfo(res)
      } catch {
        /* tiché */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!info) return null

  const dismiss = (): void => {
    localStorage.setItem(DISMISS_KEY, info.latest)
    setInfo(null)
  }

  return (
    <div className="updatebar">
      <span className="updatebar__icon">
        <Icon name="download" size={15} />
      </span>
      <span className="updatebar__text">
        A new version <strong>v{info.latest}</strong> is available. You have v{info.current}.
      </span>
      <button className="updatebar__btn" onClick={() => window.api.openExternal(info.url)}>
        View release
      </button>
      <button className="updatebar__close" onClick={dismiss} title="Dismiss">
        <Icon name="close" size={13} />
      </button>
    </div>
  )
}
