/**
 * Desktop yt-dlp metadata client (NEX-131 A段).
 *
 * Replaces `downloadEngine.getVideoInfo` / `getVideoInfoWithCommand` /
 * `getPlaylistInfo`, which were the only stateless calls on the legacy
 * download engine. Uses the existing ytdlpManager-bound binary, so
 * cookies/proxy/runtime args stay consistent with the queue executor.
 */

import { retryTransientYtDlpNetworkError } from '@vidbee/downloader-core'
import type { PlaylistInfo, VideoInfo, VideoInfoCommandResult } from '../../shared/types'
import { settingsManager } from '../settings'
import { scopedLoggers } from '../utils/logger'
import { createBoundedTextBuffer } from './bounded-output-buffer'
import { probeConfiguredBrowserCookieAccess } from './browser-cookie-access'
import { buildPlaylistInfoArgs, buildVideoInfoArgs, formatYtDlpCommand } from './command-utils'
import { ytdlpManager } from './ytdlp-manager'

/**
 * Return a cookie-permission error when macOS blocks the configured browser.
 */
const cookieAccessError = (): string | null =>
  probeConfiguredBrowserCookieAccess(settingsManager.getAll().browserForCookies)

const logger = scopedLoggers.download

const inflateEstimatedSizes = (info: VideoInfo): VideoInfo => {
  if (!(Array.isArray(info.formats) && info.duration) || info.duration <= 0) {
    return info
  }
  const duration = info.duration
  for (const format of info.formats) {
    if (
      !(format.filesize || format.filesize_approx) &&
      typeof format.tbr === 'number' &&
      format.tbr > 0
    ) {
      format.filesize_approx = Math.round(((format.tbr * 1000) / 8) * duration)
    }
  }
  return info
}

const parseVideoInfoPayload = (stdout: string): VideoInfo => {
  try {
    return JSON.parse(stdout) as VideoInfo
  } catch (error) {
    const firstLine = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith('{') || line.startsWith('['))
    if (!firstLine) {
      throw error
    }
    return JSON.parse(firstLine) as VideoInfo
  }
}

interface RawVideoInfoWithFallbacks extends VideoInfo {
  entries?: RawVideoInfoWithFallbacks[]
  requested_formats?: VideoInfo['formats']
  format_id?: string
  ext?: string
  height?: number
  width?: number
  fps?: number
  vcodec?: string
  acodec?: string
  filesize?: number
  filesize_approx?: number
  format_note?: string
  video_ext?: string
  audio_ext?: string
  tbr?: number
  quality?: number
  protocol?: string
  language?: string
}

const hasFormats = (info: VideoInfo): boolean =>
  Array.isArray(info.formats) && info.formats.length > 0

const isAuthOrCookiesError = (message: string): boolean =>
  /sign in to confirm|login required|requires (?:cookies|authentication)|cookies are no longer valid|not a bot/i.test(
    message
  )

const hasCookieAuth = (settings: ReturnType<typeof settingsManager.getAll>): boolean =>
  Boolean(
    (settings.browserForCookies && settings.browserForCookies !== 'none') ||
      settings.cookiesPath?.trim()
  )

const withoutCookieAuth = (
  settings: ReturnType<typeof settingsManager.getAll>
): ReturnType<typeof settingsManager.getAll> => ({
  ...settings,
  browserForCookies: 'none',
  cookiesPath: ''
})

const normalizeVideoInfo = (info: RawVideoInfoWithFallbacks, fallbackUrl: string): VideoInfo => {
  if (hasFormats(info)) {
    return inflateEstimatedSizes(info)
  }

  const entryWithFormats = info.entries?.find((entry) => hasFormats(entry))
  if (entryWithFormats) {
    return normalizeVideoInfo(entryWithFormats, fallbackUrl)
  }

  if (info.requested_formats?.length) {
    return inflateEstimatedSizes({ ...info, formats: info.requested_formats })
  }

  if (info.format_id) {
    return inflateEstimatedSizes({
      ...info,
      formats: [
        {
          format_id: info.format_id,
          ext: info.ext ?? 'unknown',
          height: info.height,
          width: info.width,
          fps: info.fps,
          vcodec: info.vcodec,
          acodec: info.acodec,
          filesize: info.filesize,
          filesize_approx: info.filesize_approx,
          format_note: info.format_note,
          video_ext: info.video_ext,
          audio_ext: info.audio_ext,
          tbr: info.tbr,
          quality: info.quality,
          protocol: info.protocol,
          language: info.language
        }
      ]
    })
  }

  return { ...info, id: info.id || fallbackUrl, title: info.title || fallbackUrl, formats: [] }
}

const buildVideoInfoFallbackArgs = (
  url: string,
  settings: ReturnType<typeof settingsManager.getAll>
): string[] => {
  const args = buildVideoInfoArgs(url, settings)
  const jsonArgIndex = args.indexOf('-j')
  if (jsonArgIndex >= 0) {
    args[jsonArgIndex] = '-J'
  }
  return args
}

/**
 * Run one yt-dlp video probe and parse the resulting video info payload.
 */
const execVideoInfo = (url: string, args: string[]): Promise<VideoInfo> =>
  new Promise((resolve, reject) => {
    const proc = ytdlpManager.getInstance().exec(args)
    const stdout = createBoundedTextBuffer()
    const stderr = createBoundedTextBuffer()
    proc.ytDlpProcess?.stdout?.on('data', (d: Buffer) => stdout.append(d))
    proc.ytDlpProcess?.stderr?.on('data', (d: Buffer) => stderr.append(d))
    proc.on('close', (code) => {
      const out = stdout.get()
      const err = stderr.get()
      if (code === 0 && out) {
        try {
          resolve(normalizeVideoInfo(parseVideoInfoPayload(out) as RawVideoInfoWithFallbacks, url))
        } catch (error) {
          reject(new Error(`Failed to parse video info: ${error}`))
        }
        return
      }
      logger.error('Failed to fetch video info for:', url, 'exit', code, err)
      reject(new Error(err || 'Failed to fetch video info'))
    })
    proc.on('error', reject)
  })

const fetchVideoInfoWithSettings = async (
  url: string,
  settings: ReturnType<typeof settingsManager.getAll>
): Promise<VideoInfo> => {
  const info = await retryTransientYtDlpNetworkError(() =>
    execVideoInfo(url, buildVideoInfoArgs(url, settings))
  )
  if (hasFormats(info)) {
    return info
  }
  return retryTransientYtDlpNetworkError(() =>
    execVideoInfo(url, buildVideoInfoFallbackArgs(url, settings))
  )
}

export const fetchVideoInfo = async (url: string): Promise<VideoInfo> => {
  const blocked = cookieAccessError()
  if (blocked) {
    throw new Error(blocked)
  }

  const settings = settingsManager.getAll()
  try {
    return await fetchVideoInfoWithSettings(url, settings)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!(hasCookieAuth(settings) && isAuthOrCookiesError(message))) {
      throw error
    }
    logger.warn('Retrying video info without cookies after auth/cookie failure:', url)
    return fetchVideoInfoWithSettings(url, withoutCookieAuth(settings))
  }
}

const fetchVideoInfoWithCommandAndSettings = async (
  url: string,
  settings: ReturnType<typeof settingsManager.getAll>
): Promise<VideoInfoCommandResult> => {
  const args = buildVideoInfoArgs(url, settings)
  const ytDlpCommand = formatYtDlpCommand(args)
  try {
    const info = await fetchVideoInfoWithSettings(url, settings)
    return { info, ytDlpCommand }
  } catch (error) {
    return {
      ytDlpCommand,
      error: error instanceof Error ? error.message : 'Failed to fetch video info'
    }
  }
}

export const fetchVideoInfoWithCommand = async (url: string): Promise<VideoInfoCommandResult> => {
  const args = buildVideoInfoArgs(url, settingsManager.getAll())
  const ytDlpCommand = formatYtDlpCommand(args)
  const blocked = cookieAccessError()
  if (blocked) {
    return { error: blocked, ytDlpCommand }
  }

  const settings = settingsManager.getAll()
  const result = await fetchVideoInfoWithCommandAndSettings(url, settings)
  if (!(result.error && hasCookieAuth(settings) && isAuthOrCookiesError(result.error))) {
    return result
  }

  logger.warn('Retrying video info command without cookies after auth/cookie failure:', url)
  const retry = await fetchVideoInfoWithCommandAndSettings(url, withoutCookieAuth(settings))
  return {
    ...retry,
    cookiesIgnored: Boolean(retry.info)
  }
}

interface RawPlaylistEntry {
  id?: string
  title?: string
  url?: string
  webpage_url?: string
  original_url?: string
  ie_key?: string
}

const resolveEntryUrl = (entry: RawPlaylistEntry): string => {
  if (entry.url?.startsWith('http')) {
    return entry.url
  }
  if (entry.webpage_url) {
    return entry.webpage_url
  }
  if (entry.original_url) {
    return entry.original_url
  }
  if (!entry.url) {
    return entry.id ?? ''
  }
  const ie = entry.ie_key?.toLowerCase() ?? ''
  if (ie.includes('youtubemusic')) {
    return `https://music.youtube.com/watch?v=${entry.url}`
  }
  if (ie.includes('youtube')) {
    return `https://www.youtube.com/watch?v=${entry.url}`
  }
  return entry.id ?? ''
}

/**
 * Run one yt-dlp playlist listing probe.
 */
const execPlaylistInfo = (url: string, args: string[]): Promise<PlaylistInfo> =>
  new Promise((resolve, reject) => {
    const proc = ytdlpManager.getInstance().exec(args)
    const stdout = createBoundedTextBuffer()
    const stderr = createBoundedTextBuffer()
    proc.ytDlpProcess?.stdout?.on('data', (d: Buffer) => stdout.append(d))
    proc.ytDlpProcess?.stderr?.on('data', (d: Buffer) => stderr.append(d))
    proc.on('close', (code) => {
      const out = stdout.get()
      const err = stderr.get()
      if (code === 0 && out) {
        try {
          const parsed = JSON.parse(out) as {
            id?: string
            title?: string
            entries?: RawPlaylistEntry[]
          }
          const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : []
          const entries = rawEntries
            .map((entry, i) => ({
              id: entry.id || `${i}`,
              title: entry.title || `Entry ${i + 1}`,
              url: resolveEntryUrl(entry),
              index: i + 1
            }))
            .filter((e) => e.url.length > 0)
          resolve({
            id: parsed.id || url,
            title: parsed.title || 'Playlist',
            entries,
            entryCount: entries.length
          })
          return
        } catch (error) {
          reject(new Error(`Failed to parse playlist info: ${error}`))
          return
        }
      }
      logger.error('Failed to fetch playlist info for:', url, 'exit', code, err)
      reject(new Error(err || 'Failed to fetch playlist info'))
    })
    proc.on('error', reject)
  })

export const fetchPlaylistInfo = async (url: string): Promise<PlaylistInfo> => {
  const blocked = cookieAccessError()
  if (blocked) {
    throw new Error(blocked)
  }
  const args = buildPlaylistInfoArgs(url, settingsManager.getAll())
  return retryTransientYtDlpNetworkError(() => execPlaylistInfo(url, args))
}
