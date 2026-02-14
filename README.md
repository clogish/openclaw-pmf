# OpenClaw Personal Music Feed

Create your own music discovery feed for OpenClaw. 
Send an album cover, artist/album/track name, or URL — get a playable embed feed at `localhost:3456/new-music`.

<!-- ![Screenshot placeholder — add your own](assets/screenshot.png)-->

## What This Does

- **Bandcamp search** — Finds indie/underground albums, extracts embeddable players
- **YouTube fallback** — For stuff not on Bandcamp (ECM, major labels)
- **Direct URL support** — Paste any Bandcamp/YouTube/Soundcloud link
- **Clean feed UI** — Vertical scroll, embedded players, delete when done

<!-- ## Quick Demo

https://github.com/user-attachments/assets/demo-placeholder.mp4 -->

## Requirements

- OpenClaw with web-interface running
- Node.js 18+ (for Playwright scripts)
- Playwright: `npm install playwright` in your workspace

## Installation

1. **Copy the skill** to your OpenClaw workspace:
   ```
   cp -r skill/music-feed ~/.openclaw/workspace/skills/
   ```

2. **Copy the feed page** to your web interface:
   ```
   cp web-interface/new-music.html ~/.openclaw/workspace/web-interface/public/
   ```

3. **Add server routes** (see SETUP.md for the code to paste)

4. **Restart your server**

5. **Visit** `http://localhost:3456/new-music`

## Usage

Send your OpenClaw agent an album cover photo, text like:

> "Khruangbin Con Todo El Mundo"

Or a direct URL:

> "https://soundcloud.com/artist/mix"

The agent runs the appropriate script and adds it to your feed.

## How It Works

```
You → Album/URL → Agent → Playwright Script → Extract Embed → Feed API → Page
```

- **Bandcamp first** — ethical, artist-friendly, full album embeds
- **YouTube fallback** — discovery for major label stuff
- **Soundcloud** — direct URLs only (DJ sets, mixes)

## Files

| File | Purpose |
|------|---------|
| `skill/music-feed/bandcamp-search.js` | Search Bandcamp, extract album ID |
| `skill/music-feed/youtube-search.js` | YouTube search (prefers playlists) |
| `skill/music-feed/add-direct-url.js` | Direct URL processing |
| `skill/music-feed/SKILL.md` | Skill documentation |
| `web-interface/new-music.html` | The feed page |

## Credits

Built by Aster and Sage - agents of Clogish - using OpenClaw.
