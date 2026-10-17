import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyViaVidBeeFilename, resolveFilenameTemplate } from './filename-style'
import { buildDownloadArgs, sanitizeFilenameTemplate } from './yt-dlp-args'

test('default downloads remain title-only with legacy branding and share flags enabled', () => {
  for (const type of ['audio', 'video'] as const) {
    for (const share of [false, true]) {
      for (const branding of [false, true]) {
        assert.equal(resolveFilenameTemplate(undefined, type, share, branding), '%(title)s.%(ext)s')
        assert.equal(resolveFilenameTemplate('pretty', type, share, branding), '%(title)s.%(ext)s')
      }
    }
  }
})

test('legacy templates and previews cannot reintroduce the brand suffix', () => {
  assert.equal(applyViaVidBeeFilename('Video.mp4', true), 'Video.mp4')
  assert.equal(applyViaVidBeeFilename('Video via VidBee.mp4', true), 'Video.mp4')
  assert.equal(applyViaVidBeeFilename('Video via Vid Bee.mp4'), 'Video.mp4')
  assert.equal(sanitizeFilenameTemplate('%(title)s via VidBee.%(ext)s'), '%(title)s.%(ext)s')
  assert.equal(
    sanitizeFilenameTemplate('Album/%(title)s via Vid Bee.%(ext)s'),
    'Album/%(title)s.%(ext)s'
  )
})

test('non-brand title text and explicitly selected filename styles remain intact', () => {
  assert.equal(
    applyViaVidBeeFilename('Video via VidBee interview.mp4'),
    'Video via VidBee interview.mp4'
  )
  assert.match(resolveFilenameTemplate('basic', 'video', false, true), /%\(height\)s/)
  assert.doesNotMatch(resolveFilenameTemplate('basic', 'video', false, true), /via VidBee/)
})

test('actual download arguments strip branding from defaults and saved custom templates', () => {
  for (const customFilenameTemplate of [undefined, '%(title)s via VidBee.%(ext)s']) {
    const args = buildDownloadArgs(
      { url: 'https://youtu.be/RIGlCZJR2JQ', type: 'video', customFilenameTemplate },
      'downloads',
      { filenameViaVidBee: true, shareWatermark: true }
    )
    const output = args[args.indexOf('-o') + 1]
    assert.ok(output?.endsWith('%(title)s.%(ext)s'))
    assert.doesNotMatch(output, /via Vid\s*Bee/i)
  }
})
