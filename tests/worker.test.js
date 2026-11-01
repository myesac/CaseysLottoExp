// ----------------------------------------------------------------------------------
//  Name:    worker.test.js
//  Author:  Mark Casey
//
//  Purpose: Tests for worker/index.js request handling, using an in-memory KV
//           namespace and rate limiter in place of the Cloudflare bindings.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import worker from '../worker/index.js'

// ── Fakes ─────────────────────────────────────────────────
function makeEnv({ password = 'pw', allow = true } = {}) {
  const store = new Map()

  return {
    ADMIN_PASSWORD: password,
    LOTTO_DATA: {
      get: async (key) => (store.has(key) ? JSON.parse(store.get(key)) : null),
      put: async (key, value) => {
        store.set(key, value)
      },
    },
    ADMIN_LIMITER: { limit: async () => ({ success: allow }) },
    store,
  }
}

function saveRequest(body, headers = {}) {
  return new Request('https://lotto.test/api/sets', {
    method: 'POST',
    headers: { Authorization: 'Bearer pw', 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

// ── Tests ─────────────────────────────────────────────────
describe('worker /api', () => {
  it('serves data with security headers', async () => {
    const res = await worker.fetch(new Request('https://lotto.test/api/data'), makeEnv())

    expect(res.status).toBe(200)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(Array.isArray((await res.json()).history)).toBe(true)
  })

  it('saves valid number sets', async () => {
    const env = makeEnv()
    const res = await worker.fetch(saveRequest({ numberSets: { A: [[1, 2, 3]] } }), env)

    expect(res.status).toBe(200)
    expect(JSON.parse(env.store.get('number-sets'))).toEqual({ A: [[1, 2, 3]] })
  })

  it.each([
    ['a wrong password', saveRequest({}, { Authorization: 'Bearer nope' }), 401],
    ['a non-JSON content type', saveRequest('{}', { 'Content-Type': 'text/plain' }), 415],
    ['an oversized body', saveRequest('x'.repeat(100_001)), 413],
    ['invalid JSON', saveRequest('{'), 400],
    ['invalid sets', saveRequest({ numberSets: { A: [[1, 2]] } }), 400],
    ['a GET to an admin path', new Request('https://lotto.test/api/sets'), 405],
  ])('rejects %s', async (_label, request, status) => {
    const env = makeEnv()
    const res = await worker.fetch(request, env)

    expect(res.status).toBe(status)
    expect(env.store.has('number-sets')).toBe(false)
  })

  it('returns 503 when no password is configured', async () => {
    const res = await worker.fetch(saveRequest({}), makeEnv({ password: '' }))
    expect(res.status).toBe(503)
  })

  it('returns 429 when rate limited, before checking the password', async () => {
    const res = await worker.fetch(saveRequest({}), makeEnv({ allow: false }))
    expect(res.status).toBe(429)
  })

  it('hides internal errors behind a generic 500', async () => {
    const env = makeEnv()
    env.LOTTO_DATA.get = async () => {
      throw new Error('KV exploded at /internal/path')
    }
    const res = await worker.fetch(new Request('https://lotto.test/api/data'), env)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Unexpected server error' })
  })
})
