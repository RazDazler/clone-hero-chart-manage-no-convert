import { useStore } from '../store'
import { Icon } from './Icon'

export function MarketplaceModal(): JSX.Element | null {
  const song = useStore((s) => s.marketplacePrompt)
  const close = useStore((s) => s.closeMarketplace)

  if (!song) return null
  const url = song.externalUrl || song.downloadPageUrl || song.downloadUrl

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="modal modal--confirm" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>Official DLC</h2>
          <button className="modal__close" onClick={close}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="modal__body">
          <p className="confirm-text">
            <strong>
              {song.artist} – {song.title}
            </strong>
            <br />
            This song is official DLC and isn’t downloadable here — it’s only available in the
            store. Do you want to open its page in your browser?
          </p>
          {url ? <p className="confirm-url">{url}</p> : null}
        </div>
        <div className="modal__foot">
          <button className="btn-secondary" onClick={close}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!url}
            onClick={() => {
              if (url) window.api.openExternal(url)
              close()
            }}
          >
            <Icon name="external" size={14} /> Open in browser
          </button>
        </div>
      </div>
    </div>
  )
}
