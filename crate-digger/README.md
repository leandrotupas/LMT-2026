# y2r Crate Digger

Music discovery, crate digging and DJ library management. **Find it. Follow it. Collect it. Play it.**

A self-contained app inside this repository. It is separate from the portfolio site: the Astro build, its tokens and its pages are not affected.

## Run it

Requires Node.js 22.13 or later. There are no npm dependencies.

```bash
cd crate-digger
npm start
```

Open http://127.0.0.1:4777 and create an account. On Windows use `npm.cmd start`.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` / `HOST` | `4777` / `127.0.0.1` | Where the server listens |
| `CRATE_DIGGER_DB` | `crate-digger/data/crate-digger.db` | SQLite database file |
| `CRATE_DIGGER_CONTACT` | `self-hosted` | Contact text in the User-Agent that MusicBrainz asks API clients to send |
| `CRATE_DIGGER_SECURE_COOKIE` | off | Set to `1` when served over HTTPS |
| `NODE_USE_ENV_PROXY` | off | Set to `1` if your network requires an HTTPS proxy |

Tests: `npm test` (parser, cleaner, Camelot/BPM, exports and the full HTTP API against an in-memory database).

## What is real and what is a link

| Service | In the app |
|---|---|
| Apple Music (iTunes Search API) | Live track results, artwork, previews, link lookups |
| MusicBrainz + Cover Art Archive | Live recordings, artists, labels, releases, credits, tags |
| Discogs | Release, artist and label pages without a key; search and style browsing with your personal token |
| Last.fm | Similar artists, related tracks and tag charts with your API key |
| SoundCloud, YouTube, Spotify, Mixcloud | Search links; link titles through oEmbed where reachable |
| Bandcamp, Beatport, Traxsource, Juno, Qobuz, 1001Tracklists | Search and genre links only. No scraping |

External links are always labelled as searches and open in a new tab. Nothing is invented when a service is unavailable: the source shows an error and the links remain. MusicBrainz is limited to one request per second, so Explore pages can take a few seconds.

The external URL patterns for Beatport, Traxsource, Juno, Qobuz and 1001Tracklists could not be opened from the build environment. Check them once in a browser.

## Structure

```
server/   Node http server, SQLite schema, accounts, integrations
shared/   Title cleaner, tracklist parser, Camelot/BPM, platforms, exports (used by server and browser)
public/   Static front end: vanilla JS modules, self-hosted fonts, one stylesheet
test/     node:test suites
```

Data model: users, sessions, settings, artists, labels, releases, genres, tags, tracks, track_tags, crates, crate_tracks, sources, acquisitions, status_history, tracklists, tracklist_entries, discovery_steps. A track is one record however many crates it is in. Saving an existing artist/title/version reuses that record, and "Original Mix" counts as the original version.

## rekordbox

M3U8 exports list only tracks marked **In Library** with a local file path. Relative paths are joined to the music folder set in Settings. Paths are never invented, and every export shows what was left out. Import in rekordbox with File → Import → Import Playlist. rekordbox XML is not offered until it has been tested against real rekordbox exports.

## Later: local companion

The browser cannot read audio files. A future local companion could analyse BPM and key, read rekordbox XML, match saved tracks to files, find duplicate audio and sync file paths through the same API. None of that is claimed today.
