# CHM Spotify resolver (Cloudflare Worker)

Reads a **full** Spotify playlist (any length) via the official Spotify Web API and
returns a normalized track list for Clone Hero Chart Manager. The app's built-in
embed reader only sees the first 100 tracks; this Worker removes that limit.

The Spotify app credentials live only here as Worker secrets — never in the desktop
app or the repo.

## Endpoint

```
GET https://chm-spotify.<subdomain>.workers.dev/?url=<spotify playlist link or id>
```

Response:

```jsonc
{ "ok": true, "name": "My playlist", "tracks": [{ "title": "…", "artist": "…", "durationMs": 190000 }], "total": 234 }
// or
{ "ok": false, "error": "not-a-playlist" | "not-found" | "empty" | "auth" | "upstream" }
```

## One-time setup

1. **Create a Spotify app** at <https://developer.spotify.com/dashboard> (any name;
   no redirect URI needed — we use the Client Credentials flow). Copy its
   **Client ID** and **Client secret**.
2. **Install deps:** `cd worker && npm install`
3. **Set the secrets** (paste each value at the prompt — they never leave your machine):
   ```
   npx wrangler secret put SPOTIFY_CLIENT_ID
   npx wrangler secret put SPOTIFY_CLIENT_SECRET
   ```
4. **Deploy:** `npx wrangler deploy`
   Wrangler prints the URL (e.g. `https://chm-spotify.<subdomain>.workers.dev`).
5. Put that URL into `SPOTIFY_WORKER_URL` in
   `app/src/main/core/spotify.ts`.

## Notes

- Client Credentials = app-only token (no user login) → reads **public** playlists.
  Private playlists / "Liked Songs" would need user OAuth (not done here).
- Only public playlist metadata passes through; the Worker holds no user data.
