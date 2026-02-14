#!/usr/bin/env node
/**
 * Standalone Music Feed Server
 *
 * A simple Express server for the personal music feed.
 * Compatible with OpenClaw structure but runs independently.
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3456;

// Data file path
const MUSIC_FEED = path.join(__dirname, 'data', 'music-feed.json');

// Middleware
app.use(express.json());
app.use(express.static('web-interface'));

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

// Serve the feed page at root and /new-music
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-interface', 'new-music.html'));
});

app.get('/new-music', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-interface', 'new-music.html'));
});

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
    } catch (e) {
      // File doesn't exist yet, return empty array
      items = [];
    }
    // Sort by most recent first
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

    if (!source || !url) {
      return res.status(400).json({ error: 'source and url are required' });
    }

    let items = [];
    try {
      const data = await fs.readFile(MUSIC_FEED, 'utf-8');
      items = JSON.parse(data);
    } catch (e) {
      items = [];
    }

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

    // Ensure data directory exists
    await fs.mkdir(path.dirname(MUSIC_FEED), { recursive: true });
    await fs.writeFile(MUSIC_FEED, JSON.stringify(items, null, 2));

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update rating for an item
app.put('/api/music-feed/:id/rating', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    let items = [];
    try {
      const data = await fs.readFile(MUSIC_FEED, 'utf-8');
      items = JSON.parse(data);
    } catch (e) {
      items = [];
    }

    const item = items.find(i => i.id === id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    item.rating = rating;
    item.ratedAt = Date.now();

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
    } catch (e) {
      items = [];
    }

    items = items.filter(i => i.id !== id);
    await fs.writeFile(MUSIC_FEED, JSON.stringify(items, null, 2));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🎵 Personal Music Feed Server');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  📡 Server running at: http://localhost:${PORT}`);
  console.log(`  🎧 Music Feed: http://localhost:${PORT}/new-music`);
  console.log('');
  console.log('  API Endpoints:');
  console.log(`    GET    /api/music-feed            - List all items`);
  console.log(`    POST   /api/music-feed            - Add new item`);
  console.log(`    PUT    /api/music-feed/:id/rating - Rate item (1-5 stars)`);
  console.log(`    DELETE /api/music-feed/:id        - Remove item`);
  console.log('');
  console.log('  Scripts:');
  console.log('    node skill/music-feed/bandcamp-search.js "artist album"');
  console.log('    node skill/music-feed/youtube-search.js "artist album"');
  console.log('    node skill/music-feed/add-direct-url.js "https://..."');
  console.log('═══════════════════════════════════════════════════════════════');
});
