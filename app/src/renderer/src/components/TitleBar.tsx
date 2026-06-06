import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { Icon } from './Icon'

export function TitleBar(): JSX.Element {
  const setShowSettings = useStore((s) => s.setShowSettings)
  const setShowLibrary = useStore((s) => s.setShowLibrary)

  const [gameRunning, setGameRunning] = useState(false)
  const [busy, setBusy] = useState(false)

  // Init + subscribe na změny stavu hry.
  useEffect(() => {
    void window.api.isGameRunning().then(setGameRunning)
    const off = window.api.onGameStatus(setGameRunning)
    return off
  }, [])

  const onClickGame = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      const res = await window.api.bringGameToFront()
      if (!res.ok) window.alert(res.error)
      else if (!gameRunning) {
        // Po spuštění obvykle trvá pár sekund než se objeví v procesech.
        setGameRunning(true)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="titlebar">
      <div className="titlebar__left">
        <button
          className={`gamebtn ${gameRunning ? 'gamebtn--running' : ''} ${
            busy ? 'gamebtn--busy' : ''
          }`}
          title={
            gameRunning
              ? 'Clone Hero is running — click to bring it to the front'
              : 'Launch Clone Hero'
          }
          onClick={onClickGame}
          disabled={busy}
        >
          <span className={`gamebtn__dot ${gameRunning ? 'gamebtn__dot--on' : ''}`} />
          <Icon name="gamepad" size={16} />
          <span className="gamebtn__label">
            {busy
              ? 'Working…'
              : gameRunning
                ? 'Switch to Clone Hero'
                : 'Launch Clone Hero'}
          </span>
        </button>
      </div>

      <div className="titlebar__brand">
        <h1 className="brand" aria-label="Clone Hero Chart Manager">
          <span className="brand__ch">
            <span className="brand__ch-c">C</span>
            <span className="brand__ch-h">H</span>
            <span className="brand__ch-sub" aria-hidden="true">
              Clone Hero
            </span>
          </span>
          <span className="brand__rest">ART&nbsp;MANAGER</span>
        </h1>
      </div>

      <div className="titlebar__actions">
        <button
          className="titlebar__btn"
          title="Library manager"
          onClick={() => setShowLibrary(true)}
        >
          <Icon name="folder" size={16} />
        </button>
        <button className="titlebar__btn" title="Settings" onClick={() => setShowSettings(true)}>
          <Icon name="settings" size={16} />
        </button>
        <button
          className="titlebar__btn"
          title="Hide window (F10)"
          onClick={() => window.api.hideOverlay()}
        >
          <Icon name="minimize" size={16} />
        </button>
        <button
          className="titlebar__btn titlebar__btn--close"
          title="Quit program"
          onClick={() => window.api.quitApp()}
        >
          <Icon name="close" size={15} />
        </button>
      </div>
    </div>
  )
}
