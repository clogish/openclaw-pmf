# Contribution: 5-Star Rating System

This contribution adds a polished rating system to the music feed.

## What's New

### User-Facing Features
- **Visual Rating Interface** - Hover over any album artwork to reveal a subtle rating overlay
- **5-Star Rating** - Click any star (1-5) to rate albums/tracks
- **Persistent Display** - Ratings show as gold stars in the feed metadata
- **Smooth Interactions** - Low opacity by default, full reveal on hover, animated star scaling

### Technical Implementation

#### Frontend Changes (`web-interface/new-music.html`)
- Added rating overlay CSS at bottom of album embeds
- Compact black box design with stars and label text inside
- Opacity states: 15% default, 40% when rated, 100% on hover
- Stars positioned in flexbox with backdrop blur effect
- Rating display in metadata row when rated

#### Backend Changes (`server.js`)
- New endpoint: `PUT /api/music-feed/:id/rating`
- Validates rating is 1-5
- Stores `rating` and `ratedAt` timestamp
- Returns updated item on success

#### Data Structure
Each feed item now optionally includes:
```json
{
  "rating": 5,          // 1-5 stars (optional)
  "ratedAt": 1234567890 // Unix timestamp (optional)
}
```

## Files Modified

1. **web-interface/new-music.html**
   - Added `.rating-overlay` styles (lines 241-330)
   - Added rating stars generation in `renderFeed()` (lines 366-374)
   - Added `rateItem()` function (lines 398-411)
   - Added rating display in metadata (line 383-384)

2. **server.js**
   - Added `PUT /api/music-feed/:id/rating` endpoint (lines 105-136)
   - Updated startup message to show new endpoint (line 141)

3. **README.md**
   - Added rating system to feature list (line 14)

4. **DEV-SETUP.md**
   - Added rating endpoint to API table (line 58)
   - Added rating example (lines 75-81)

5. **CHANGELOG.md**
   - Documented the new feature

## Integration Guide for OpenClaw

### Option 1: Copy Modified Files
```bash
# From this repo to OpenClaw workspace
cp web-interface/new-music.html ~/.openclaw/workspace/web-interface/public/
```

Then merge the server.js changes manually (see lines 105-136 and 141).

### Option 2: Manual Integration

**In your OpenClaw `server.js`:**

Add this endpoint after your existing music-feed routes:

```javascript
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
```

## Testing

```bash
# Start the server
npm start

# Add some music
node skill/music-feed/bandcamp-search.js "Khruangbin The Universe Smiles"

# Visit http://localhost:3456
# Hover over the album art and click stars to rate
```

## Notes

- No breaking changes - existing feeds work without modification
- Ratings are optional - unrated items display normally
- Works with all three sources (Bandcamp, YouTube, SoundCloud)
- Compatible with all four themes
- Mobile-friendly (works on hover/touch)

## Future Enhancements

Potential additions you might want to make:
- Filter feed by rating (show only 5-star albums, etc.)
- Sort by rating
- Average rating display
- Rating-based recommendations
- Export ratings to CSV/JSON
