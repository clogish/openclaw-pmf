# Development Setup

This is a standalone development environment for the Personal Music Feed project. You can develop features independently without needing the full OpenClaw infrastructure.

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server will run at `http://localhost:3456`

## Project Structure

```
openclaw-pmf/
├── server.js                      # Standalone Express server
├── package.json                   # Dependencies
├── data/                          # Auto-created on first run
│   └── music-feed.json           # Your music data
├── skill/music-feed/             # Playwright scripts
│   ├── bandcamp-search.js        # Search Bandcamp
│   ├── youtube-search.js         # Search YouTube
│   └── add-direct-url.js         # Add by direct URL
└── web-interface/
    └── new-music.html            # The feed UI
```

## Using the Scripts

### Add music by search query (Bandcamp)
```bash
node skill/music-feed/bandcamp-search.js "Khruangbin Con Todo El Mundo"
```

### Add music by search query (YouTube fallback)
```bash
node skill/music-feed/youtube-search.js "Keith Jarrett Koln Concert"
```

### Add music by direct URL
```bash
node skill/music-feed/add-direct-url.js "https://artist.bandcamp.com/album/album-name"
node skill/music-feed/add-direct-url.js "https://www.youtube.com/watch?v=VIDEO_ID"
node skill/music-feed/add-direct-url.js "https://soundcloud.com/artist/track"
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/music-feed` | Get all feed items |
| POST | `/api/music-feed` | Add a new item |
| PUT | `/api/music-feed/:id/rating` | Rate an item (1-5 stars) |
| DELETE | `/api/music-feed/:id` | Remove an item |

### Example: Add via API

```bash
curl -X POST http://localhost:3456/api/music-feed \
  -H "Content-Type: application/json" \
  -d '{
    "source": "bandcamp",
    "url": "https://artist.bandcamp.com/album/title",
    "embedUrl": "https://bandcamp.com/EmbeddedPlayer/album=123456/...",
    "artist": "Artist Name",
    "title": "Album Title",
    "type": "album"
  }'
```

### Example: Rate an item

```bash
curl -X PUT http://localhost:3456/api/music-feed/ITEM_ID/rating \
  -H "Content-Type: application/json" \
  -d '{"rating": 5}'
```

## Development Workflow

1. **Start the server**: `npm start`
2. **Open the feed**: http://localhost:3456
3. **Add music**: Use the scripts or API directly
4. **Make changes**: Edit files, refresh browser
5. **Restart server**: Only needed if you edit `server.js`

## OpenClaw Compatibility

This standalone setup is fully compatible with OpenClaw:
- Same API structure
- Same data format (`data/music-feed.json`)
- Same Playwright scripts
- Your friend can copy your features directly into their OpenClaw workspace

## Contributing Features

When you add a feature:
1. Test it locally with `npm start`
2. Document any new API endpoints
3. Update this README if needed
4. Share the changes with your friend

They can integrate your changes by:
- Copying updated files to `~/.openclaw/workspace/`
- Merging your API routes into their `server.js`
- Updating their web interface files

## Troubleshooting

**Port 3456 already in use?**
```bash
# Use a different port
PORT=3457 npm start
```

**Playwright installation issues?**
```bash
# Install browser binaries
npx playwright install
```

**Scripts can't find the API?**
- Make sure the server is running first
- Scripts expect the API at `http://localhost:3456/api/music-feed`

## Next Steps

Now that you have the dev environment running, you can:
- Add new features to the web interface
- Extend the API with new endpoints
- Improve the Playwright scripts
- Add new music sources
- Build new views/filters

Happy coding! 🎵
