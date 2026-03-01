// api/notify.js — Vercel Serverless Function
// Receives a push notification request from the app and sends it to the partner's device.
// The VAPID private key stays safely on the server, never exposed to the browser.
//
// Auth model: shared secret (PUSH_API_KEY) + strict Origin allowlist.
// Full JWT/session auth is not applicable here — this is a stateless serverless function
// with no session store or auth backend. The shared secret lives only in Vercel env vars.
// For stronger auth in the future, integrate Firebase Auth + ID token verification.

import pkg from 'web-push'
const { sendNotification, setVapidDetails } = pkg

// ── Origin allowlist ──────────────────────────────────────────────────────────
// Only accept requests originating from the production domain or localhost (dev).
const ALLOWED_ORIGINS = new Set([
  'https://kishanlovesaditi.online',
  'http://localhost:5173',
  'http://localhost:4173',
])

function isAllowedOrigin(req) {
  const origin = req.headers['origin'] || req.headers['referer'] || ''
  return [...ALLOWED_ORIGINS].some(o => origin.startsWith(o))
}

// ── Shared-secret auth ────────────────────────────────────────────────────────
// The client sends X-Push-Token matching the PUSH_API_KEY env var.
// This is timing-safe compared against a constant-time equality check.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

function isAuthorized(req) {
  const apiKey = process.env.PUSH_API_KEY
  if (!apiKey) return false
  return safeEqual(req.headers['x-push-token'] || '', apiKey)
}

// ── In-process rate limiting ──────────────────────────────────────────────────
// Limits per client IP. Note: each serverless cold-start resets these counters,
// so this is a best-effort guard suitable for a personal app.
const RATE_LIMIT  = 20  // max requests
const RATE_WINDOW = 60 * 1000  // per 60 seconds
const rateMap = new Map() // ip → { count, resetAt }

function isRateLimited(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown'
  const now = Date.now()
  const entry = rateMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return false
  }
  entry.count++
  if (entry.count > RATE_LIMIT) return true
  return false
}

// ── Subscription shape guard ──────────────────────────────────────────────────
function isValidSubscription(sub) {
  return (
    sub &&
    typeof sub === 'object' &&
    typeof sub.endpoint === 'string' &&
    sub.endpoint.startsWith('https://') &&
    sub.keys &&
    typeof sub.keys.p256dh === 'string' &&
    typeof sub.keys.auth === 'string'
  )
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // 1. Origin allowlist — rejects any non-browser or off-domain caller
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // 2. Rate limiting — prevents spam even with a valid token
  if (isRateLimited(req)) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  // 3. Shared-secret auth (timing-safe comparison)
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // 4. Body validation
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const { subscription, title, body, url } = req.body

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid title' })
  }

  if (!isValidSubscription(subscription)) {
    return res.status(400).json({ error: 'Invalid push subscription object' })
  }

  // 5. VAPID env vars guard
  const vapidPublic  = process.env.VITE_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!vapidPublic || !vapidPrivate) {
    console.error('VAPID keys not configured')
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  try {
    setVapidDetails(
      'mailto:notifications@kishanlovesaditi.online',
      vapidPublic,
      vapidPrivate
    )

    const payload = JSON.stringify({
      title: String(title).slice(0, 200),
      body:  body ? String(body).slice(0, 500) : '',
      url:   typeof url === 'string' && url.startsWith('/') ? url : '/',
    })

    await sendNotification(subscription, payload)
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Push error:', err)
    // 410 = subscription expired/invalid — client should clean up
    res.status(err.statusCode === 410 ? 410 : 500).json({ error: err.message })
  }
}
