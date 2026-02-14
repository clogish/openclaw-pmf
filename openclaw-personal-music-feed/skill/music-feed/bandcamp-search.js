#!/usr/bin/env node
/**
 * Bandcamp Search → Music Feed
 *
 * Search Bandcamp for an artist/album, extract embed data, POST to feed API.
 *
 * Usage:
 *   node bandcamp-search.js "artist album title"
 *
 * Output: JSON of the added feed item
 */

const { chromium } = require('playwright');

const FEED_API = 'http://localhost:3456/api/music-feed';
const TIMEOUT = 20000;

async function searchBandcamp(query) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();

    const searchUrl = `https://bandcamp.com/search?q=${encodeURIComponent(query)}&item_type=a`;
    console.error(`Searching Bandcamp: "${query}"...`);
    await page.goto(searchUrl, { timeout: TIMEOUT, waitUntil: 'networkidle' });

    // Pick the first album/track result
    const resultUrl = await page.evaluate(() => {
      const items = document.querySelectorAll('.result-items .searchresult');
      for (const item of items) {
        const link = item.querySelector('.heading a');
        if (link) return link.href;
      }
      return null;
    });

    if (!resultUrl) throw new Error('No Bandcamp results found for query: ' + query);

    console.error(`Found result: ${resultUrl}`);
    await page.goto(resultUrl, { timeout: TIMEOUT, waitUntil: 'networkidle' });

    // Extract metadata from the album/track page
    const metadata = await page.evaluate(() => {
      // Artist name
      const artistEl = document.querySelector('#band-name-location .title') ||
                        document.querySelector('p[id="band-name-location"] .title') ||
                        document.querySelector('.albumartist a') ||
                        document.querySelector('a.band-name') ||
                        document.querySelector('span[itemprop="byArtist"] a');
      const artist = artistEl ? artistEl.textContent.trim() : document.title.split(' | ').pop()?.trim() || 'Unknown Artist';

      // Album/track title
      const titleEl = document.querySelector('h2.trackTitle') ||
                       document.querySelector('#name-section h2') ||
                       document.querySelector('h2[itemprop="name"]');
      const title = titleEl ? titleEl.textContent.trim() : document.title.split(' | ')[0]?.trim() || 'Unknown Title';

      // Determine type
      const isAlbum = !!document.querySelector('#trackInfoInner') || window.location.pathname.includes('/album/');
      const type = isAlbum ? 'album' : 'track';

      // Album ID from page source (looks for album=NNNNNN in script tags / TralbumData)
      const pageSource = document.documentElement.innerHTML;
      const albumMatch = pageSource.match(/\balbum[_\s]?id\s*[:=]\s*(\d+)/) ||
                         pageSource.match(/\balbum\s*=\s*(\d+)/) ||
                         pageSource.match(/"id"\s*:\s*(\d+)/);
      const albumId = albumMatch ? albumMatch[1] : null;

      // Track ID for single tracks
      const trackMatch = pageSource.match(/\btrack_id\s*:\s*(\d+)/) ||
                          pageSource.match(/\btrack\s*=\s*(\d+)/);
      const trackId = trackMatch ? trackMatch[1] : null;

      return { artist, title, type, albumId, trackId, url: window.location.href };
    });

    if (!metadata.albumId && !metadata.trackId) {
      throw new Error('Could not extract Bandcamp album/track ID from page');
    }

    // Build embed URL
    let embedUrl;
    if (metadata.type === 'album' && metadata.albumId) {
      embedUrl = `https://bandcamp.com/EmbeddedPlayer/album=${metadata.albumId}/size=large/bgcol=333333/linkcol=0f91ff/tracklist=true/transparent=true/`;
    } else if (metadata.trackId) {
      const albumPart = metadata.albumId ? `album=${metadata.albumId}/` : '';
      embedUrl = `https://bandcamp.com/EmbeddedPlayer/${albumPart}track=${metadata.trackId}/size=large/bgcol=333333/linkcol=0f91ff/tracklist=false/transparent=true/`;
    } else {
      embedUrl = `https://bandcamp.com/EmbeddedPlayer/album=${metadata.albumId}/size=large/bgcol=333333/linkcol=0f91ff/tracklist=true/transparent=true/`;
    }

    const embedHtml = `<iframe style="border: 0; width: 100%; height: 470px;" src="${embedUrl}" seamless><a href="${metadata.url}">${metadata.title} by ${metadata.artist}</a></iframe>`;

    // POST to feed API
    const payload = {
      source: 'bandcamp',
      url: metadata.url,
      embedUrl,
      embedHtml,
      artist: metadata.artist,
      title: metadata.title,
      type: metadata.type
    };

    console.error(`Adding to feed: ${metadata.artist} - ${metadata.title}`);

    const response = await fetch(FEED_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Feed API error ${response.status}: ${text}`);
    }

    const result = await response.json();
    return result;

  } finally {
    await browser.close();
  }
}

// CLI
const query = process.argv.slice(2).join(' ');
if (!query) {
  console.error('Usage: node bandcamp-search.js "artist album title"');
  process.exit(1);
}

searchBandcamp(query)
  .then(result => console.log(JSON.stringify(result, null, 2)))
  .catch(err => {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  });
