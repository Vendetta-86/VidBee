import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createVideoInfoRequestCoordinator } from './video-request-coordinator'

test('a new video request rejects responses belonging to the previous video', () => {
  const coordinator = createVideoInfoRequestCoordinator()
  const oldRequest = coordinator.beginRequest()
  const newRequest = coordinator.beginRequest()
  assert.equal(coordinator.isCurrentRequest(oldRequest), false)
  assert.equal(coordinator.isCurrentRequest(newRequest), true)
})

test('closing and reopening the dialog invalidates its outstanding video response', () => {
  const coordinator = createVideoInfoRequestCoordinator()
  const request = coordinator.beginRequest()
  coordinator.invalidate()
  assert.equal(coordinator.isCurrentRequest(request), false)
  const reopenedRequest = coordinator.beginRequest()
  assert.equal(coordinator.isCurrentRequest(reopenedRequest), true)
  assert.equal(coordinator.isCurrentRequest(request), false)
})
