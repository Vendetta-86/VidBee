const YOUTUBE_HOSTS = ['youtube.com', 'youtu.be', 'm.youtube.com'] as const
// YouTube channel/handle landing pages (e.g. /@handle/videos, /channel/UC…,
// /user/…, /c/…) list many videos; route them through the playlist flow so a
// single unavailable entry can't abort the whole fetch (GitHub issue #322).
const YOUTUBE_CHANNEL_PATH = /^\/(@[^/]+|channel\/|user\/|c\/)/i

/**
 * Check whether a URL should be handled as a playlist-style resource.
 *
 * Issue ref: #316, #322.
 */
export const isPlaylistLikeUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value)
    const host = parsed.hostname.toLowerCase()
    const pathname = parsed.pathname.toLowerCase()
    const isYouTubeHost = YOUTUBE_HOSTS.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    )

    // A YouTube watch URL may include a `list` parameter for navigation context.
    // It still represents the selected video, rather than a request to preview
    // or download the entire playlist.
    if (isYouTubeHost && pathname === '/watch' && parsed.searchParams.get('v')?.trim()) {
      return false
    }

    const playlistQueryKeys = ['collection', 'list', 'playlist', 'set']
    if (
      playlistQueryKeys.some((key) => {
        return Boolean(parsed.searchParams.get(key)?.trim())
      })
    ) {
      return true
    }

    if (isYouTubeHost && YOUTUBE_CHANNEL_PATH.test(parsed.pathname)) {
      return true
    }

    return ['/playlist', '/playlists/', '/collection/', '/collections/', '/sets/'].some((token) =>
      pathname.includes(token)
    )
  } catch {
    return false
  }
}
