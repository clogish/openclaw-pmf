# music-feed

Add music to the Personal Music Feed at http://localhost:3456/new-music.

## Prerequisites

- **Node 18+** — scripts use `fetch()` built-in (no polyfill needed)
- **Playwright installed** — `npx playwright install chromium` (one-time setup)
- **Feed server running** — start with `cd openclaw-pmf && npm run dev` (or `npm start`)

### How to verify the server is running

```bash
curl -s http://localhost:3456/api/music-feed | head -c 100
# Should return JSON. If "connection refused" → server is not running.
```

---

## Workflow

Follow this order when adding music by artist/album name:

1. **Try Bandcamp first** — best for indie/underground, provides full album embeds
2. **Fall back to YouTube** — use if Bandcamp returns no results or user prefers it
3. **SoundCloud — direct URL only** — primarily for DJ sets/mixes; never search-fallback

---

## Scripts

### `bandcamp-search.js` — Search Bandcamp
```bash
node skills/music-feed/bandcamp-search.js "artist album title"
```
- Searches `bandcamp.com/search?q=QUERY&item_type=a`
- Picks the top album result
- Extracts album ID, builds embed URL, POSTs to feed API
- Sets `type: "album"` in the feed entry
- Output: JSON of the added item (stdout); diagnostics on stderr

**Example:**
```bash
$ node skills/music-feed/bandcamp-search.js "burial untrue"
{
  "id": "a1b2c3",
  "artist": "Burial",
  "title": "Untrue",
  "source": "bandcamp",
  "type": "album",
  "embedUrl": "https://bandcamp.com/EmbeddedPlayer/album=12345678/...",
  "url": "https://burial.bandcamp.com/album/untrue"
}
```

---

### `youtube-search.js` — Search YouTube
```bash
node skills/music-feed/youtube-search.js "artist album title"
```
- Searches YouTube for `QUERY full album`
- Prefers playlist results (better for full albums); falls back to videos
- Extracts video/playlist ID, builds embed URL, POSTs to feed API
- Sets `type: "album"` (playlist) or `"track"` (single video) in the feed entry
- Output: JSON of the added item (stdout); diagnostics on stderr

**Example:**
```bash
$ node skills/music-feed/youtube-search.js "aphex twin selected ambient works"
{
  "id": "d4e5f6",
  "artist": "Aphex Twin",
  "title": "Selected Ambient Works 85-92",
  "source": "youtube",
  "type": "album",
  "embedUrl": "https://www.youtube.com/embed/videoseries?list=PLxxxxxx",
  "url": "https://www.youtube.com/playlist?list=PLxxxxxx"
}
```

---

### `add-direct-url.js` — Add by URL
```bash
node skills/music-feed/add-direct-url.js "https://..."
```

Supported URL formats and the `type` each sets:

| Source | URL pattern | `type` set |
|--------|------------|------------|
| Bandcamp | `bandcamp.com/album/...` | `"album"` |
| YouTube video | `youtube.com/watch?v=...` | `"track"` |
| YouTube playlist | `youtube.com/playlist?list=...` | `"album"` |
| YouTube Music | `music.youtube.com/...` | `"track"` or `"album"` |
| SoundCloud | `soundcloud.com/...` | `"mix"` (DJ sets) or `"track"` |

- Bandcamp: navigates page via Playwright, extracts album ID + metadata
- YouTube variants: extracts video/playlist ID, fetches title (no browser needed)
- SoundCloud: uses oEmbed API — fast and reliable, no browser needed

**Example:**
```bash
$ node skills/music-feed/add-direct-url.js "https://yppah.bandcamp.com/album/wherever-you-are"
{
  "id": "g7h8i9",
  "artist": "Yppah",
  "title": "Wherever You Are",
  "source": "bandcamp",
  "type": "album",
  "embedUrl": "https://bandcamp.com/EmbeddedPlayer/album=98765432/...",
  "url": "https://yppah.bandcamp.com/album/wherever-you-are"
}
```

---

## Feed API

| Method | Path | Body |
|--------|------|------|
| GET | `/api/music-feed` | — |
| POST | `/api/music-feed` | `{source, url, embedUrl, embedHtml, artist, title, type}` |
| DELETE | `/api/music-feed/:id` | — |

**`type` values:**
- `"album"` — full album (set by all scripts when a playlist or album page is detected)
- `"track"` — single song (set when a single video or track URL is used)
- `"mix"` — DJ set or mix (set by `add-direct-url.js` for SoundCloud sets)

---

## Error Handling

| Problem | Cause | Fix |
|---------|-------|-----|
| `connection refused` on POST | Server not running | `npm run dev` in project root |
| Bandcamp: no results | Artist not on Bandcamp | Try `youtube-search.js` |
| YouTube: results don't load | JS timeout | Increase `waitForTimeout` in script |
| Bandcamp: album ID not found | Merch/fan page, not music | Use direct album URL instead |
| SoundCloud oEmbed fails | URL is private/removed | Check URL in browser first |

---

## Notes

- Uses Playwright headless Chromium — **not** the Chrome Relay browser tool
- All diagnostic output → `stderr`; only the final JSON result → `stdout`
- Scripts POST directly to `http://localhost:3456/api/music-feed` — server must be running locally
