#!/usr/bin/env node
/**
 * YouTube Search → Music Feed
 *
 * Search YouTube for an artist/album (full album), extract embed data, POST to feed API.
 *
 * Usage:
 *   node youtube-search.js "artist album title"
 *
 * Output: JSON of the added feed item
 */

const { chromium } = require('playwright');

const FEED_API = 'http://localhost:3456/api/music-feed';
const TIMEOUT = 20000;

async function searchYouTube(query) {
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

    const searchQuery = `${query} full album`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    console.error(`Searching YouTube: "${searchQuery}"...`);

    await page.goto(searchUrl, { timeout: TIMEOUT, waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // YT is JS-heavy

    // Extract first meaningful video or playlist result
    const result = await page.evaluate(() => {
      // Try playlists first (better for full albums)
      const playlistLinks = Array.from(document.querySelectorAll('a#video-title[href*="list="]'));
      for (const link of playlistLinks) {
        const href = link.getAttribute('href') || '';
        const listMatch = href.match(/[?&]list=([A-Za-z0-9_-]+)/);
        if (listMatch) {
          return {
            type: 'playlist',
            id: listMatch[1],
            title: link.textContent.trim() || link.getAttribute('title') || '',
            url: 'https://www.youtube.com' + href
          };
        }
      }

      // Fall back to video results
      const videoLinks = Array.from(document.querySelectorAll('a#video-title[href*="watch?v="]'));
      for (const link of videoLinks) {
        const href = link.getAttribute('href') || '';
        const videoMatch = href.match(/[?&]v=([A-Za-z0-9_-]+)/);
        if (videoMatch) {
          return {
            type: 'video',
            id: videoMatch[1],
            title: link.textContent.trim() || link.getAttribute('title') || '',
            url: 'https://www.youtube.com' + href
          };
        }
      }

      return null;
    });

    if (!result) throw new Error('No YouTube results found for query: ' + query);

    console.error(`Found: [${result.type}] ${result.title}`);

    // Parse artist/title from result title (best effort: "Artist - Album")
    let artist = query.split(' ').slice(0, 2).join(' ');
    let title = result.title;
    const dashMatch = result.title.match(/^(.+?)\s[-–]\s(.+)$/);
    if (dashMatch) {
      artist = dashMatch[1].trim();
      title = dashMatch[2].trim();
    }

    // Build embed URL
    let embedUrl, embedHtml, videoUrl;
    if (result.type === 'playlist') {
      embedUrl = `https://www.youtube.com/embed/videoseries?list=${result.id}`;
      videoUrl = `https://www.youtube.com/playlist?list=${result.id}`;
    } else {
      embedUrl = `https://www.youtube.com/embed/${result.id}`;
      videoUrl = `https://www.youtube.com/watch?v=${result.id}`;
    }

    embedHtml = `<iframe width="100%" height="315" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

    // POST to feed API
    const payload = {
      source: 'youtube',
      url: videoUrl,
      embedUrl,
      embedHtml,
      artist,
      title,
      type: result.type === 'playlist' ? 'album' : 'track'
    };

    console.error(`Adding to feed: ${artist} - ${title}`);

    const response = await fetch(FEED_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Feed API error ${response.status}: ${text}`);
    }

    const feedResult = await response.json();
    return feedResult;

  } finally {
    await browser.close();
  }
}

// CLI
const query = process.argv.slice(2).join(' ');
if (!query) {
  console.error('Usage: node youtube-search.js "artist album title"');
  process.exit(1);
}

searchYouTube(query)
  .then(result => console.log(JSON.stringify(result, null, 2)))
  .catch(err => {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  });
