// CHM Spotify resolver (Cloudflare Worker).
//
// Proč Worker: oficiální Spotify Web API umí přečíst CELÝ playlist (stránkuje po
// 100 bez stropu) a dá i album — ale chce klíč aplikace, který NESMÍ do
// distribuované desktopové appky. Worker ten klíč drží na serveru (wrangler
// secret) a appce vrací už normalizovaný seznam skladeb.
//
// Endpoint: GET /?url=<odkaz nebo ID playlistu>
//   → { ok: true, name, tracks: [{ title, artist, durationMs }], total }
//   → { ok: false, error: 'not-a-playlist' | 'not-found' | 'empty' | 'auth' | 'upstream' }
//
// Tajemství (nastavit přes `npx wrangler secret put …`, NE do repa):
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET  (Client Credentials flow = jen app,
//   bez přihlášení uživatele → čte veřejné playlisty).

export interface Env {
  SPOTIFY_CLIENT_ID: string
  SPOTIFY_CLIENT_SECRET: string
}

interface Track {
  title: string
  artist: string
  durationMs: number | null
}

// App-token (Client Credentials) žije ~1 h; cachujeme v paměti isolate.
let cachedToken: { value: string; exp: number } | null = null

async function getToken(env: Env): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.exp > now + 60_000) return cachedToken.value
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)
    },
    body: 'grant_type=client_credentials'
  })
  if (!res.ok) throw new Error(`token ${res.status}`)
  const j = (await res.json()) as { access_token: string; expires_in?: number }
  cachedToken = { value: j.access_token, exp: now + (j.expires_in ?? 3600) * 1000 }
  return cachedToken.value
}

function parsePlaylistId(input: string): string | null {
  const s = (input || '').trim()
  if (!s) return null
  let m = s.match(/spotify:playlist:([A-Za-z0-9]+)/)
  if (m) return m[1]
  m = s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?playlist\/([A-Za-z0-9]+)/i)
  if (m) return m[1]
  if (/^[A-Za-z0-9]{22}$/.test(s)) return s
  return null
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      // Cachuj jen úspěch — chyby (auth/upstream/429) nesmí viset 5 minut.
      'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store'
    }
  })
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const id = parsePlaylistId(url.searchParams.get('url') || url.searchParams.get('id') || '')
    if (!id) return json({ ok: false, error: 'not-a-playlist' }, 400)

    let auth: Record<string, string>
    try {
      auth = { Authorization: `Bearer ${await getToken(env)}` }
    } catch {
      return json({ ok: false, error: 'auth' }, 502)
    }

    // Meta (jméno playlistu). 404 → neexistuje / není veřejný.
    const metaRes = await fetch(
      `https://api.spotify.com/v1/playlists/${id}?fields=name`,
      { headers: auth }
    )
    if (metaRes.status === 404) return json({ ok: false, error: 'not-found' }, 404)
    if (!metaRes.ok) return json({ ok: false, error: 'upstream' }, 502)
    const meta = (await metaRes.json()) as { name?: string }
    const name = (meta.name || '').trim() || 'Spotify playlist'

    // Stránkovat všechny tracky (limit 100/stránka, bez stropu; pojistka 5000).
    const tracks: Track[] = []
    const LIMIT = 100
    const HARD_CAP = 5000
    const fields = encodeURIComponent('items(track(name,duration_ms,type,artists(name))),next')
    let offset = 0
    let complete = true // false = seznam je neúplný (selhala stránka nebo strop)
    for (;;) {
      const tr = await fetch(
        `https://api.spotify.com/v1/playlists/${id}/tracks?offset=${offset}&limit=${LIMIT}&fields=${fields}`,
        { headers: auth }
      )
      if (!tr.ok) {
        // Stránka po ≥1 úspěšné selhala (429/5xx) → vrať co máme, ale jako NEúplné.
        complete = false
        break
      }
      const page = (await tr.json()) as {
        items?: { track?: { name?: string; duration_ms?: number; type?: string; artists?: { name?: string }[] } }[]
        next?: string | null
      }
      for (const it of page.items || []) {
        const t = it.track
        if (!t || t.type !== 'track') continue // přeskoč epizody/podcasty
        const title = (t.name || '').trim()
        const artist = (t.artists || [])
          .map((a) => a.name || '')
          .filter(Boolean)
          .join(', ')
          .trim()
        if (title && artist) {
          tracks.push({
            title,
            artist,
            durationMs: typeof t.duration_ms === 'number' ? t.duration_ms : null
          })
        }
      }
      offset += LIMIT
      if (!page.next) break // došli jsme na konec = kompletní
      if (offset >= HARD_CAP) {
        complete = false
        break
      }
    }

    if (tracks.length === 0) return json({ ok: false, error: 'empty' }, 404)
    return json({ ok: true, name, tracks, total: tracks.length, truncated: !complete })
  }
}
