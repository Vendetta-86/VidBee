import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inspectNetscapeCookies } from './cookie-setup'

const cookieFile = (...rows: string[]): string =>
  ['# Netscape HTTP Cookie File', ...rows].join('\n')
const row = (name: string, expires = 0, domain = '.youtube.com', value = 'test'): string =>
  `${domain}\tTRUE\t/\tTRUE\t${expires}\t${name}\t${value}`

test('leftover YouTube SID cookies do not indicate an authenticated session', () => {
  const health = inspectNetscapeCookies(cookieFile(row('__Secure-3PSID'), row('__Secure-3PAPISID')))
  assert.equal(health.status, 'empty')
  assert.deepEqual(health.sites, [])
})

test('YouTube login needs LOGIN_INFO and an authorization cookie', () => {
  assert.equal(inspectNetscapeCookies(cookieFile(row('LOGIN_INFO'))).status, 'empty')
  for (const name of ['SAPISID', '__Secure-1PAPISID', '__Secure-3PAPISID']) {
    const health = inspectNetscapeCookies(cookieFile(row('LOGIN_INFO'), row(name)))
    assert.equal(health.status, 'ok')
    assert.equal(health.sites[0]?.id, 'youtube')
  }
})

test('both required YouTube login cookies must be unexpired', () => {
  for (const rows of [
    [row('LOGIN_INFO', 1), row('SAPISID')],
    [row('LOGIN_INFO'), row('SAPISID', 1)]
  ]) {
    assert.equal(inspectNetscapeCookies(cookieFile(...rows)).status, 'expired')
  }
})

test('empty values and unrelated domains cannot establish YouTube authentication', () => {
  for (const rows of [
    [row('LOGIN_INFO', 0, '.youtube.com', ''), row('SAPISID')],
    [row('LOGIN_INFO', 0, '.google.com'), row('SAPISID', 0, '.google.com')],
    [row('LOGIN_INFO', 0, '.notyoutube.com'), row('SAPISID', 0, '.notyoutube.com')]
  ]) {
    assert.notEqual(inspectNetscapeCookies(cookieFile(...rows)).status, 'ok')
  }
})

test('HttpOnly exports and other supported sites remain usable', () => {
  const health = inspectNetscapeCookies(
    cookieFile(row('LOGIN_INFO', 0, '#HttpOnly_.youtube.com'), row('SAPISID'))
  )
  assert.equal(health.status, 'ok')
  assert.equal(inspectNetscapeCookies(cookieFile(row('SESSDATA', 0, '.bilibili.com'))).status, 'ok')
})
