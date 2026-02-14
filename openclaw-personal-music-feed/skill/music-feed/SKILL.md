# music-feed

Add music to Nick's discovery feed at http://localhost:3456/new-music.

## Scripts

### `bandcamp-search.js` — Search Bandcamp
```
node skills/music-feed/bandcamp-search.js "artist album title"
```
- Searches `bandcamp.com/search?q=QUERY&item_type=a`
- Picks the top album result
- Extracts album ID, builds embed URL, POSTs to feed API
- Output: JSON of the added item

### `youtube-search.js` — Search YouTube
```
node skills/music-feed/youtube-search.js "artist album title"
```
- Searches YouTube for `QUERY full album`
- Prefers playlist results (better for full albums), falls back to videos
- Extracts video/playlist ID, builds embed URL, POSTs to feed API
- Output: JSON of the added item

### `add-direct-url.js` — Add by URL
```
node skills/music-feed/add-direct-url.js "https://..."
```
Supports:
- `bandcamp.com` — navigates page, extracts album ID + metadata
- `youtube.com`, `youtu.be`, `music.youtube.com` — extracts video/playlist ID, fetches title
- `soundcloud.com` — uses oEmbed API (no browser needed)

Output: JSON of the added item

## Search Priority

1. **Try Bandcamp first** — better for indie/underground artists, full album embeds
2. **Fall back to YouTube** — use if Bandcamp has no results or user prefers it
3. **Soundcloud — direct URLs only** — primarily for DJ sets/mixes, never as a search fallback

## Feed API

| Method | Path | Body |
|--------|------|------|
| GET | `/api/music-feed` | — |
| POST | `/api/music-feed` | `{source, url, embedUrl, embedHtml, artist, title, type}` |
| DELETE | `/api/music-feed/:id` | — |

`type` is `"album"`, `"track"`, or `"mix"` (Soundcloud DJ sets).

## Error Handling

- If Bandcamp search returns no results → error with message, try YouTube fallback
- If YouTube page doesn't render JS results in time → increase `waitForTimeout`
- If Bandcamp album ID not found → likely a merch/fan page, not a music page
- SoundCloud oEmbed is purely HTTP — fast and reliable, no browser needed
- Feed API errors include status code + body in the error message

## Notes

- Uses Playwright headless Chromium — NOT the Chrome Relay browser tool
- Scripts use `fetch()` (Node 18+ built-in) for API calls
- All diagnostic output goes to `stderr`; only the JSON result goes to `stdout`
