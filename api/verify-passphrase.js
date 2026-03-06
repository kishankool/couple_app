// api/verify-passphrase.js — Vercel Serverless Function
// Verifies the passphrase entirely on the server so the hash never reaches
// the browser bundle. On success returns a short-lived HMAC session token
// that other server endpoints (e.g. cloudinary-sign) can verify without
// any state or database.

import crypto from 'crypto'

// ── In-process rate limiting (resets on cold start, suitable for personal app) ──
const RATE_LIMIT  = 10          // max attempts per window
const RATE_WINDOW = 60 * 1000   // 1 minute
const rateMap = new Map()

// Periodic cleanup so rateMap never grows unbounded across many requests.
// Runs every RATE_WINDOW; removes entries whose window has already expired.
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateMap) {
    if (now > entry.resetAt) rateMap.delete(ip)
  }
}, RATE_WINDOW)
// Allow Node to exit cleanly if the module is torn down (e.g. tests).
// The interval above handles all cleanup; no per-entry setTimeout is needed.
if (cleanupInterval.unref) cleanupInterval.unref()

function isRateLimited(req) {
  const ip  = req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown'
  const now = Date.now()
  const entry = rateMap.get(ip)

  if (!entry || now > entry.resetAt) {
    // Entry is absent or expired — replace with a fresh one.
    // The periodic setInterval cleanup above removes stale entries;
    // no per-entry setTimeout is needed (and would leak timer handles).
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT
}

// SHA-256 hex of the trimmed passphrase
function sha256hex(text) {
  return crypto.createHash('sha256').update(text.trim()).digest('hex')
}

// Constant-time string comparison — prevents timing attacks
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

// Shared HMAC session token helpers — format defined in api/_token.js
import { makeSessionToken, verifySessionToken } from './_token.js'
export { verifySessionToken }


export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (isRateLimited(req)) {
    return res.status(429).json({ error: 'Too many attempts — wait a minute and try again' })
  }

  // APP_PASSHASH — used only for passphrase comparison, never for token signing
  const expectedHash = process.env.APP_PASSHASH
  if (!expectedHash) {
    console.error('api/verify-passphrase: APP_PASSHASH env var is not set')
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  // SESSION_TOKEN_SECRET — distinct secret used only for signing/verifying session tokens
  const tokenSecret = process.env.SESSION_TOKEN_SECRET
  if (!tokenSecret) {
    console.error('api/verify-passphrase: SESSION_TOKEN_SECRET env var is not set')
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  const { passphrase } = req.body || {}
  if (!passphrase || typeof passphrase !== 'string' || passphrase.length > 500) {
    return res.status(400).json({ error: 'Invalid request' })
  }
  // Reject whitespace-only values before hashing — trim() would produce an
  // empty string which could accidentally match a misconfigured hash.
  if (!passphrase.trim()) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  const inputHash = sha256hex(passphrase)

  if (!safeEqual(inputHash, expectedHash)) {
    return res.status(403).json({ error: 'Wrong passphrase' })
  }

  // Correct passphrase — issue a 15-min session token signed with SESSION_TOKEN_SECRET
  const token = makeSessionToken(tokenSecret)
  return res.status(200).json({ ok: true, sessionToken: token })
}
