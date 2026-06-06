import { memo, useEffect, useState } from 'react'
import type { DownloadJob, SongResult } from '../../../shared/types'
import { formatLabel, formatLength } from '../utils'
import { Icon } from './Icon'
import { InstrumentDifficulty } from './InstrumentDifficulty'
import { RowMenu } from './RowMenu'

/** Malý komponentový wrapper pro album art — fallback na ikonu při onError. */
function AlbumArt({ url }: { url: string | null }): JSX.Element {
  const [failed, setFailed] = useState(false)
  if (!url || failed) {
    return (
      <div className="song__art-empty">
        <Icon name="note" size={22} />
      </div>
    )
  }
  return <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} />
}

interface Props {
  song: SongResult
  selected: boolean
  job?: DownloadJob
  onSelect: () => void
  onDownload: () => void
  onMarketplace: () => void
}

const STAGE_LABEL: Record<string, string> = {
  queued: 'Queued',
  resolving: 'Resolving',
  downloading: 'Downloading',
  extracting: 'Extracting',
  converting: 'Converting',
  installing: 'Installing',
  done: 'Done ✓',
  error: 'Error'
}

function formatSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

type ManualHost = 'MEGA' | 'Mediafire' | 'Shortener' | null

const SHORTENER_RE =
  /^https?:\/\/(?:[a-z0-9-]+\.)?(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|buff\.ly|is\.gd|v\.gd|cutt\.ly|shorturl\.at|rb\.gy)\//i

/** Hostitelé, u kterých nemáme spolehlivé auto-stažení (MEGA / Mediafire / shortener). */
function detectManualHost(source: string | null, url: string | null): ManualHost {
  const src = (source || '').toLowerCase()
  if (src.includes('mega')) return 'MEGA'
  if (src.includes('mediafire')) return 'Mediafire'
  if (!url) return null
  if (/mega\.(nz|co\.nz|io)/i.test(url)) return 'MEGA'
  if (/mediafire\.com/i.test(url)) return 'Mediafire'
  if (SHORTENER_RE.test(url)) return 'Shortener'
  return null
}

function manualLabel(host: Exclude<ManualHost, null>): string {
  if (host === 'Shortener') return 'Download manually'
  return `Get on ${host}`
}

function SongRowBase({
  song,
  selected,
  job,
  onSelect,
  onDownload,
  onMarketplace
}: Props): JSX.Element {
  const busy = job && job.stage !== 'done' && job.stage !== 'error'
  const pct = job && job.progress >= 0 ? Math.round(job.progress * 100) : null
  const size = formatSize(song.sizeBytes)
  const initialHost = detectManualHost(song.source, song.downloadUrl || song.downloadPageUrl)
  const [manualHost, setManualHost] = useState<ManualHost>(initialHost)

  // Pokud je to shortener (bit.ly aj.), rozbalíme na pozadí — finální host
  // (typicky MEGA / Mediafire) pak nahradí obecné "Download manually".
  useEffect(() => {
    if (initialHost !== 'Shortener') return
    const src = song.downloadUrl || song.downloadPageUrl
    if (!src) return
    let cancelled = false
    void (async () => {
      try {
        const finalUrl = await window.api.resolveUrl(src)
        if (cancelled || !finalUrl || finalUrl === src) return
        const resolved = detectManualHost(null, finalUrl)
        if (resolved && resolved !== 'Shortener') setManualHost(resolved)
      } catch {
        /* nevadí, zůstane obecný label */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [initialHost, song.downloadUrl, song.downloadPageUrl])

  const openExternal = (): void => {
    const url = song.downloadPageUrl || song.downloadUrl || song.externalUrl
    if (url) window.api.openExternal(url)
  }

  return (
    <div
      className={`song ${selected ? 'song--selected' : ''}`}
      onClick={onSelect}
      onDoubleClick={onDownload}
    >
      <div className="song__art">
        <AlbumArt url={song.albumArtUrl} />
      </div>

      <div className="song__main">
        <div className="song__title" title={song.title}>
          {song.title}
        </div>
        <div className="song__artist" title={song.artist}>
          {song.artist}
          {song.album ? <span className="song__album"> · {song.album}</span> : null}
          {song.year ? <span className="song__year"> · {song.year}</span> : null}
        </div>
        <div className="song__meta">
          <span className="badge badge--len">{formatLength(song.lengthSeconds)}</span>
          {song.official ? (
            <span className="badge badge--dlc">Official DLC</span>
          ) : (
            <span className={`badge ${song.needsConversion ? 'badge--convert' : 'badge--native'}`}>
              {formatLabel(song.gameFormat)}
              {song.needsConversion ? ' → CH' : ''}
            </span>
          )}
          {song.charter ? (
            <span className="song__charter">
              <Icon name="charter" size={12} /> {song.charter}
            </span>
          ) : null}
        </div>
      </div>

      <div className="song__diffs">
        <InstrumentDifficulty difficulties={song.difficulties} />
      </div>

      <div className="song__action">
        {job ? (
          <div className={`jobchip jobchip--${job.stage}`}>
            <span>{STAGE_LABEL[job.stage] ?? job.stage}</span>
            {pct !== null && busy ? <span className="jobchip__pct">{pct}%</span> : null}
            {job.stage === 'error' ? (
              <span className="jobchip__err" title={job.error}>
                ⚠
              </span>
            ) : null}
          </div>
        ) : song.official ? (
          <button
            className="dl-btn dl-btn--store"
            title="Official DLC — open the store page in your browser"
            onClick={(e) => {
              e.stopPropagation()
              onMarketplace()
            }}
          >
            <Icon name="external" size={14} /> Open store
          </button>
        ) : manualHost ? (
          <button
            className="dl-btn dl-btn--store"
            title={
              manualHost === 'Shortener'
                ? 'Shortened link — open in browser, then drop the downloaded file into the drop zone above'
                : `Hosted on ${manualHost} — open in browser, then drop the downloaded file into the drop zone above`
            }
            onClick={(e) => {
              e.stopPropagation()
              openExternal()
            }}
          >
            <Icon name="external" size={14} /> {manualLabel(manualHost)}
          </button>
        ) : (
          <>
            <button
              className="dl-btn"
              onClick={(e) => {
                e.stopPropagation()
                onDownload()
              }}
            >
              <Icon name="download" size={14} /> Download
            </button>
            {size ? <span className="song__size">{size}</span> : null}
          </>
        )}
      </div>

      <RowMenu song={song} />
    </div>
  )
}

/**
 * Memo s explicitním porovnáním – řádky se re-renderují JEN když se mění:
 * job (stage / progress), selected nebo identita songu. To dramaticky snižuje
 * zbytečné rerendery při běžícím downloadu (jobs:update přijde každé 1 %).
 */
export const SongRow = memo(SongRowBase, (prev, next) => {
  if (prev.song.key !== next.song.key) return false
  if (prev.selected !== next.selected) return false
  if (prev.job?.id !== next.job?.id) return false
  if (prev.job?.stage !== next.job?.stage) return false
  if (prev.job?.progress !== next.job?.progress) return false
  if (prev.job?.error !== next.job?.error) return false
  return true
})
