# Setup Guide

## Step 1: Install the Skill

Copy the `music-feed` folder to your OpenClaw workspace skills directory:

```bash
cp -r skill/music-feed ~/.openclaw/workspace/skills/
```

Or manually copy the folder via Finder.

## Step 2: Install the Feed Page

Copy `new-music.html` to your web-interface public folder:

```bash
cp web-interface/new-music.html ~/.openclaw/workspace/web-interface/public/
```

## Step 3: Add Server Routes

Open `~/.openclaw/workspace/web-interface/server.js` and add these routes:

**After the existing `require` statements, add:**
```javascript
const MUSIC_FEED = path.join(__dirname, '..', 'new-music-feed.json');
```

**After `app.use(express.static('public'));`, add:**
```javascript
// Clean URL redirects
app.get('/new-music', (req, res) => res.sendFile(path.join(__dirname, 'public', 'new-music.html')));
```

**Then add these API routes:**
```javascript
// ═══════════════════════════════════════════════════════════════
// MUSIC FEED API
// ═══════════════════════════════════════════════════════════════

// GET all feed items
app.get('/api/music-feed', async (req, res) => {
  try {
    let items = [];
    try {
      const data = await fs.readFile(MUSIC_FEED, 'utf-8');
      items = JSON.parse(data);
    } catch (e) { items = []; }
    items.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add a new item
app.post('/api/music-feed', async (req, res) => {
  try {
    const { source, url, embedUrl, embedHtml, artist, title, type } = req.body;
    if (!source || !url) return res.status(400).json({ error: 'source and url are required' });

    let items = [];
    try {
      const data = await fs.readFile(MUSIC_FEED, 'utf-8');
      items = JSON.parse(data);
    } catch (e) { items = []; }

    // Deduplicate by URL
    if (items.some(i => i.url === url)) {
      return res.status(409).json({ error: 'Already in feed' });
    }

    const item = {
      id: `music-${Date.now()}`,
      source,
      url,
      embedUrl,
      embedHtml,
      artist: artist || 'Unknown Artist',
      title: title || 'Unknown Title',
      type: type || 'album',
      addedAt: Date.now()
    };

    items.push(item);
    await fs.writeFile(MUSIC_FEED, JSON.stringify(items, null, 2));
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove an item
app.delete('/api/music-feed/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let items = [];
    try {
      const data = await fs.readFile(MUSIC_FEED, 'utf-8');
      items = JSON.parse(data);
    } catch (e) { items = []; }

    items = items.filter(i => i.id !== id);
    await fs.writeFile(MUSIC_FEED, JSON.stringify(items, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**Update the console.log at the bottom:**
```javascript
console.log(`New Music Feed: http://localhost:${PORT}/new-music.html`);
```

## Step 4: Create Data File

Create an empty JSON file for the feed data:

```bash
echo "[]" > ~/.openclaw/workspace/new-music-feed.json
```

## Step 5: Restart Server

Kill and restart your web-interface server:

```bash
cd ~/.openclaw/workspace/web-interface
pkill -f "node server.js"
node server.js
```

## Step 6: Test

Visit `http://localhost:3456/new-music` — you should see the empty feed page.

## Step 7: Configure Your Agent

Tell your OpenClaw agent how to use the music feed. Add this to your agent's instructions or SOUL.md:

```
When the user wants to add music to their discovery feed:
1. Check if input is a direct URL (bandcamp.com, youtube.com, soundcloud.com)
   - If yes: run `node skills/music-feed/add-direct-url.js "URL"`
2. If text or photo: run `node skills/music-feed/bandcamp-search.js "artist album"`
3. If Bandcamp fails: fallback to `node skills/music-feed/youtube-search.js "artist album"`
4. The script adds to the feed automatically — confirm success to the user
```

## Troubleshooting

**"Cannot find module 'playwright'"**
- Run `npm install playwright` in your workspace directory

**"No Bandcamp results found"**
- Bandcamp's search is case-sensitive — try simpler queries
- Some ECM/major label releases aren't on Bandcamp (use YouTube)

**Feed page shows "Cannot GET /new-music"**
- Make sure you added the `app.get('/new-music', ...)` redirect
- Restart the server

**Soundcloud embeds not loading**
- Soundcloud blocks some embeds — open the original link instead

## Customization

The feed page uses CSS custom properties for theming. Edit the `:root` variables in `new-music.html` to match your aesthetic.
