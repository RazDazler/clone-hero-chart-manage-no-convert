// Spotify playlist resolver.
//
// Dvě cesty:
//  1) PRIMÁRNÍ = Cloudflare Worker (`SPOTIFY_WORKER_URL`), který přes oficiální
//     Spotify Web API přečte CELÝ playlist (stránkuje po 100 bez stropu) + drží
//     klíč aplikace na serveru (ne v appce). Zdroj: `worker/`.
//  2) FALLBACK = veřejná embed stránka (bez klíče), ale jen prvních ~100 stop
//     a bez celkového počtu. Použije se, když Worker není nakonfigurovaný nebo
//     je nedostupný — feature tak funguje i bez Workeru (jen do 100).
//
// Ověřeno živě: embed = `open.spotify.com/embed/playlist/{id}` → `__NEXT_DATA__`
// → entity.trackList [{ title, subtitle(=interpret), duration }]. Jen VEŘEJNÉ
// playlisty; soukromé/Liked bez přihlášení nejdou ani přes Worker (Client
// Credentials čte jen veřejné).

import type { PlaylistResolveResult, PlaylistTrack } from '../../shared/types'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'

// URL nasazeného Workeru (viz worker/README.md). Prázdné = Worker se přeskočí a
// jede se přes embed (≤100). Worker čte CELÝ uživatelský playlist; editoriální
// (37i9…) Spotify přes Client Credentials nevydá → spadne se na embed.
const SPOTIFY_WORKER_URL = 'https://chm-spotify.hoskovskyjan.workers.dev'

// Embed očividně vrací nejvýš tolik stop; přesně tolik = pravděpodobné oříznutí.
const EMBED_CAP = 100

/**
 * Z různých tvarů Spotify odkazu vytáhne ID playlistu.
 * Podporuje: https://open.spotify.com/playlist/{id}[?si=…], s locale prefixem
 * /intl-cs/, `spotify:playlist:{id}`, i holé 22znakové base62 ID.
 */
export function parsePlaylistId(input: string): string | null {
  const s = (input || '').trim()
  if (!s) return null
  let m = s.match(/spotify:playlist:([A-Za-z0-9]+)/)
  if (m) return m[1]
  m = s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?playlist\/([A-Za-z0-9]+)/i)
  if (m) return m[1]
  if (/^[A-Za-z0-9]{22}$/.test(s)) return s
  return null
}

export async function resolveSpotifyPlaylist(input: string): Promise<PlaylistResolveResult> {
  const id = parsePlaylistId(input)
  if (!id) return { ok: false, error: 'not-a-playlist' }

  // Primárně Worker (plná délka). null = přeskočit / infra chyba → embed fallback.
  const viaWorker = await resolveViaWorker(id)
  if (viaWorker) return viaWorker

  return resolveViaEmbed(id)
}

// ── Cesta přes Worker (oficiální API, celý playlist) ──────────────────────────
async function resolveViaWorker(id: string): Promise<PlaylistResolveResult | null> {
  if (!SPOTIFY_WORKER_URL) return null
  let data: unknown
  try {
    const res = await fetch(`${SPOTIFY_WORKER_URL}/?url=${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' }
    })
    // 400/404 nesou smysluplný JSON; jiné ne-2xx = infra problém → fallback.
    if (!res.ok && res.status !== 400 && res.status !== 404) return null
    data = await res.json()
  } catch {
    return null // Worker nedostupný → embed fallback
  }
  const d = data as {
    ok?: boolean
    error?: string
    name?: string
    truncated?: boolean
    tracks?: { title?: unknown; artist?: unknown; durationMs?: unknown }[]
  } | null
  if (!d || typeof d !== 'object') return null

  if (d.ok === true && Array.isArray(d.tracks)) {
    const tracks = normalizeWorkerTracks(d.tracks)
    if (tracks.length > 0) {
      const name = typeof d.name === 'string' && d.name.trim() ? d.name.trim() : 'Spotify playlist'
      // Worker hlásí truncated, když nedočetl celý playlist (selhání stránky /
      // strop). Starší Worker to pole nemá → undefined → false (žádná regrese).
      return { ok: true, source: 'spotify', name, tracks, truncated: d.truncated === true }
    }
  }
  // Jakýkoli neúspěch Workeru → fallback na embed. Hlavně: editoriální/algoritmické
  // playlisty (37i9…) Spotify přes Client Credentials nevydá (404), ALE embed je
  // přečte (≤100). Stejně tak auth/upstream/empty → ať to skončí embedem, ne chybou.
  return null
}

function normalizeWorkerTracks(
  raw: { title?: unknown; artist?: unknown; durationMs?: unknown }[]
): PlaylistTrack[] {
  return raw
    .map((t) => ({
      title: typeof t?.title === 'string' ? t.title.trim() : '',
      artist: typeof t?.artist === 'string' ? t.artist.trim() : '',
      durationMs: typeof t?.durationMs === 'number' ? t.durationMs : null
    }))
    .filter((t) => t.title && t.artist)
}

// ── Fallback přes embed stránku (bez klíče, ≤100) ─────────────────────────────
async function resolveViaEmbed(id: string): Promise<PlaylistResolveResult> {
  let html: string
  try {
    const res = await fetch(`https://open.spotify.com/embed/playlist/${id}`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' }
    })
    if (!res.ok) return { ok: false, error: res.status === 404 ? 'not-found' : 'network' }
    html = await res.text()
  } catch {
    return { ok: false, error: 'network' }
  }

  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return { ok: false, error: 'parse' }

  let data: unknown
  try {
    data = JSON.parse(m[1])
  } catch {
    return { ok: false, error: 'parse' }
  }

  const entity = extractEntity(data)
  const rawList = Array.isArray((entity as any)?.trackList) ? ((entity as any).trackList as any[]) : []
  const tracks: PlaylistTrack[] = rawList
    .map((t) => ({
      title: typeof t?.title === 'string' ? t.title.trim() : '',
      artist: typeof t?.subtitle === 'string' ? t.subtitle.trim() : '',
      durationMs: typeof t?.duration === 'number' ? t.duration : null
    }))
    .filter((t) => t.title && t.artist)

  if (tracks.length === 0) return { ok: false, error: 'empty' }

  const name =
    typeof (entity as any)?.name === 'string' && (entity as any).name.trim()
      ? ((entity as any).name as string).trim()
      : 'Spotify playlist'

  return { ok: true, source: 'spotify', name, tracks, truncated: tracks.length >= EMBED_CAP }
}

/** Najde entity (playlist) v __NEXT_DATA__ napříč verzemi struktury. */
function extractEntity(data: unknown): Record<string, unknown> | null {
  const direct = (data as any)?.props?.pageProps?.state?.data?.entity
  if (direct && Array.isArray(direct.trackList)) return direct
  let found: Record<string, unknown> | null = null
  const walk = (n: unknown): void => {
    if (found || !n || typeof n !== 'object') return
    if (Array.isArray((n as any).trackList)) {
      found = n as Record<string, unknown>
      return
    }
    for (const v of Object.values(n as Record<string, unknown>)) walk(v)
  }
  walk(data)
  return found
}
