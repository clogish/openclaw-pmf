#!/usr/bin/env node
/**
 * Add Direct URL → Music Feed
 *
 * Process a direct URL from Bandcamp, YouTube, or SoundCloud and add to the feed.
 *
 * Usage:
 *   node add-direct-url.js "https://artist.bandcamp.com/album/album-name"
 *   node add-direct-url.js "https://www.youtube.com/watch?v=VIDEO_ID"
 *   node add-direct-url.js "https://soundcloud.com/artist/track"
 *
 * Output: JSON of the added feed item
 */

const { chromium } = require('playwright');

const FEED_API = 'http://localhost:3456/api/music-feed';
const TIMEOUT = 20000;

function detectSource(url) {
  if (url.includes('bandcamp.com')) return 'bandcamp';
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('music.youtube.com')) return 'youtube';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  return null;
}

async function processBandcamp(url) {
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
    console.error(`Fetching Bandcamp page: ${url}`);
    await page.goto(url, { timeout: TIMEOUT, waitUntil: 'networkidle' });

    const metadata = await page.evaluate(() => {
      const artistEl = document.querySelector('#band-name-location .title') ||
                        document.querySelector('a.band-name') ||
                        document.querySelector('span[itemprop="byArtist"] a');
      const artist = artistEl ? artistEl.textContent.trim() : document.title.split(' | ').pop()?.trim() || 'Unknown Artist';

      const titleEl = document.querySelector('h2.trackTitle') ||
                       document.querySelector('#name-section h2') ||
                       document.querySelector('h2[itemprop="name"]');
      const title = titleEl ? titleEl.textContent.trim() : document.title.split(' | ')[0]?.trim() || 'Unknown Title';

      const isAlbum = window.location.pathname.includes('/album/') || !!document.querySelector('#trackInfoInner');
      const type = isAlbum ? 'album' : 'track';

      const pageSource = document.documentElement.innerHTML;
      const albumMatch = pageSource.match(/\balbum[_\s]?id\s*[:=]\s*(\d+)/) ||
                         pageSource.match(/\balbum\s*=\s*(\d+)/) ||
                         pageSource.match(/"id"\s*:\s*(\d+)/);
      const albumId = albumMatch ? albumMatch[1] : null;

      const trackMatch = pageSource.match(/\btrack_id\s*:\s*(\d+)/) ||
                          pageSource.match(/\btrack\s*=\s*(\d+)/);
      const trackId = trackMatch ? trackMatch[1] : null;

      return { artist, title, type, albumId, trackId, url: window.location.href };
    });

    if (!metadata.albumId && !metadata.trackId) {
      throw new Error('Could not extract Bandcamp album/track ID from page');
    }

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

    return { source: 'bandcamp', url: metadata.url, embedUrl, embedHtml, artist: metadata.artist, title: metadata.title, type: metadata.type };

  } finally {
    await browser.close();
  }
}

async function processYouTube(url) {
  // Extract video or playlist ID from URL
  let videoId = null;
  let listId = null;
  let type = 'track';

  // Handle youtu.be short URLs
  const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]+)/);
  if (shortMatch) videoId = shortMatch[1];

  // Handle standard watch URLs
  const videoMatch = url.match(/[?&]v=([A-Za-z0-9_-]+)/);
  if (videoMatch) videoId = videoMatch[1];

  // Handle playlist URLs
  const listMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (listMatch) { listId = listMatch[1]; type = 'album'; }

  if (!videoId && !listId) throw new Error('Could not extract YouTube video/playlist ID from URL: ' + url);

  // Fetch page title via Playwright for metadata
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
    const targetUrl = listId
      ? `https://www.youtube.com/playlist?list=${listId}`
      : `https://www.youtube.com/watch?v=${videoId}`;

    console.error(`Fetching YouTube page: ${targetUrl}`);
    await page.goto(targetUrl, { timeout: TIMEOUT, waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const pageTitle = await page.title();
    // Strip " - YouTube" suffix
    const cleanTitle = pageTitle.replace(/ - YouTube$/, '').trim();

    let artist = 'Unknown Artist';
    let title = cleanTitle;
    const dashMatch = cleanTitle.match(/^(.+?)\s[-–]\s(.+)$/);
    if (dashMatch) {
      artist = dashMatch[1].trim();
      title = dashMatch[2].trim();
    }

    let embedUrl, embedHtml, canonicalUrl;
    if (listId) {
      embedUrl = `https://www.youtube.com/embed/videoseries?list=${listId}`;
      canonicalUrl = `https://www.youtube.com/playlist?list=${listId}`;
    } else {
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
      canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }

    embedHtml = `<iframe width="100%" height="315" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

    return { source: 'youtube', url: canonicalUrl, embedUrl, embedHtml, artist, title, type };

  } finally {
    await browser.close();
  }
}

async function processSoundcloud(url) {
  // Use oEmbed API — no browser needed
  console.error(`Fetching SoundCloud oEmbed for: ${url}`);
  const oEmbedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;

  const response = await fetch(oEmbedUrl);
  if (!response.ok) throw new Error(`SoundCloud oEmbed failed: ${response.status}`);

  const data = await response.json();

  // Extract iframe src from embed HTML
  const srcMatch = data.html?.match(/src="([^"]+)"/);
  const embedUrl = srcMatch ? srcMatch[1] : '';

  // Parse artist / title from "Title by Artist" or similar
  let artist = data.author_name || 'Unknown Artist';
  let title = data.title || 'Unknown Title';
  // SoundCloud titles are usually "Track Title" and author_name is the artist
  const byMatch = title.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    title = byMatch[1].trim();
    artist = byMatch[2].trim();
  }

  // Soundcloud is primarily used for DJ sets/mixes
  const type = 'mix';

  return { source: 'soundcloud', url, embedUrl, embedHtml: data.html || '', artist, title, type };
}

async function addDirectUrl(url) {
  const source = detectSource(url);
  if (!source) throw new Error(`Unsupported URL. Must be Bandcamp, YouTube, or SoundCloud: ${url}`);

  console.error(`Detected source: ${source}`);

  let payload;
  if (source === 'bandcamp') payload = await processBandcamp(url);
  else if (source === 'youtube') payload = await processYouTube(url);
  else if (source === 'soundcloud') payload = await processSoundcloud(url);

  console.error(`Adding to feed: ${payload.artist} - ${payload.title}`);

  const response = await fetch(FEED_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Feed API error ${response.status}: ${text}`);
  }

  return await response.json();
}

// CLI
const url = process.argv[2];
if (!url) {
  console.error('Usage: node add-direct-url.js <url>');
  console.error('  Supported: bandcamp.com, youtube.com, youtu.be, music.youtube.com, soundcloud.com');
  process.exit(1);
}

addDirectUrl(url)
  .then(result => console.log(JSON.stringify(result, null, 2)))
  .catch(err => {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  });
