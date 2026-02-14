# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **5-Star Rating System** - Beautiful visual overlay on album artwork
  - Subtle overlay at bottom of album art (15% opacity by default, 40% when rated)
  - Hover to reveal full rating interface with smooth fade-in
  - Click stars to rate 1-5, with visual feedback on hover
  - Compact black box design containing stars and label text
  - Rating persists and displays as gold stars (★) in feed metadata
  - New API endpoint: `PUT /api/music-feed/:id/rating`
  - Stores `rating` (1-5) and `ratedAt` timestamp on each item

### Technical Details
- Rating overlay positioned at bottom of embed with gradient backdrop
- Compact design: stars (26px) and label in single container with backdrop blur
- Stars scale on hover (1.15x) with smooth transitions
- Rated items show gold stars (★) in the feed metadata row
- Compatible with all themes (Deep Work, Morning Paper, Clean Desk, Evening Editorial)
- No breaking changes to existing data structure
- Responsive and works with Bandcamp, YouTube, and SoundCloud embeds

## [1.0.0] - Initial Release

### Added
- Bandcamp search integration via Playwright
- YouTube search with playlist support
- SoundCloud direct URL support (oEmbed API)
- Express.js API server with JSON file storage
- Clean, themeable web interface with 4 visual themes
- Add, view, and delete functionality for music items
- Embeddable players for all three platforms
