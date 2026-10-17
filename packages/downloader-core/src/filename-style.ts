export const FILENAME_STYLES = ['classic', 'basic', 'pretty', 'nerdy'] as const

export type FilenameStyle = (typeof FILENAME_STYLES)[number]

export const DEFAULT_FILENAME_STYLE: FilenameStyle = 'pretty'
export const DEFAULT_FILENAME_VIA_VIDBEE = false

export const VIA_VIDBEE_LABEL = 'via VidBee'
export const DEFAULT_FILENAME_TEMPLATE = '%(title)s.%(ext)s'
export const SHARED_FILENAME_TEMPLATE = DEFAULT_FILENAME_TEMPLATE

const LEGACY_BRAND_SUFFIX = /\s+via Vid\s*Bee(?=\.(?:%\(ext\)s|[a-z0-9]+)$|$)/i
const AUTHOR_FIELD = '%(uploader,creator,channel,uploader_id)s'

const FILENAME_STYLE_TEMPLATES: Record<FilenameStyle, { audio: string; video: string }> = {
  basic: {
    audio: `%(title)s - ${AUTHOR_FIELD}.%(ext)s`,
    video: `%(title)s - ${AUTHOR_FIELD} (%(height)sp, %(vcodec)s).%(ext)s`
  },
  classic: {
    audio: '%(extractor)s_%(id)s_audio.%(ext)s',
    video: '%(extractor)s_%(id)s_%(width)sx%(height)s_%(vcodec)s.%(ext)s'
  },
  nerdy: {
    audio: `%(title)s - ${AUTHOR_FIELD} (%(extractor)s, %(id)s).%(ext)s`,
    video: `%(title)s - ${AUTHOR_FIELD} (%(height)sp, %(vcodec)s, %(extractor)s, %(id)s).%(ext)s`
  },
  pretty: {
    audio: DEFAULT_FILENAME_TEMPLATE,
    video: DEFAULT_FILENAME_TEMPLATE
  }
}

export const FILENAME_STYLE_PREVIEWS: Record<FilenameStyle, { audio: string; video: string }> = {
  basic: {
    audio: 'Audio Title - Audio Author.mp3',
    video: 'Video Title - Video Author (1080p, h264).mp4'
  },
  classic: {
    audio: 'youtube_dQw4w9WgXcQ_audio.mp3',
    video: 'youtube_dQw4w9WgXcQ_1920x1080_h264.mp4'
  },
  nerdy: {
    audio: 'Audio Title - Audio Author (youtube, dQw4w9WgXcQ).mp3',
    video: 'Video Title - Video Author (1080p, h264, youtube, dQw4w9WgXcQ).mp4'
  },
  pretty: {
    audio: 'Audio Title.mp3',
    video: 'Video Title.mp4'
  }
}

/**
 * Return whether a value is a supported filename style.
 *
 * @param value Unknown setting value from storage or the UI.
 * @returns True when the value is a known filename style.
 */
export const isFilenameStyle = (value: unknown): value is FilenameStyle =>
  typeof value === 'string' && (FILENAME_STYLES as readonly string[]).includes(value)

/**
 * Keep fork filenames unbranded, including templates saved by older releases.
 *
 * @param value yt-dlp template or preview filename.
 * @param _enabled Legacy setting retained for caller compatibility.
 * @returns The filename without a generated brand suffix.
 */
export const applyViaVidBeeFilename = (
  value: string,
  _enabled = DEFAULT_FILENAME_VIA_VIDBEE
): string => value.replace(LEGACY_BRAND_SUFFIX, '')

/**
 * Resolve the yt-dlp output template for a filename style and download type.
 *
 * Share-watermark and legacy filename flags never add branding in this fork.
 * An unset style uses the title-only pretty template.
 *
 * @param style Saved filename style, or undefined for the pretty default.
 * @param type Video or audio download.
 * @param shareWatermark Whether the share-watermark filename should be used.
 * @param filenameViaVidBee Whether to append via VidBee before the extension.
 * @returns A yt-dlp `-o` template without the download directory.
 */
export const resolveFilenameTemplate = (
  style: FilenameStyle | undefined,
  type: 'audio' | 'video',
  shareWatermark = false,
  filenameViaVidBee = DEFAULT_FILENAME_VIA_VIDBEE
): string => {
  if (shareWatermark) {
    return SHARED_FILENAME_TEMPLATE
  }

  const resolvedStyle = isFilenameStyle(style) ? style : DEFAULT_FILENAME_STYLE
  return applyViaVidBeeFilename(FILENAME_STYLE_TEMPLATES[resolvedStyle][type], filenameViaVidBee)
}
