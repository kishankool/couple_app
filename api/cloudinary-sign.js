// api/cloudinary-sign.js — Vercel Serverless Function
// Generates a signed upload signature so the Cloudinary API secret
// never needs to be exposed in the browser bundle.
//
// Auth: caller must supply the X-Session-Token header issued by
// /api/verify-passphrase after a successful passphrase check.
// The token is a 15-min HMAC window — stateless, no DB needed.

import crypto from 'crypto'

// Constant-time comparison
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

// Accept current and previous 15-min window to avoid edge-case lockouts
function isValidSessionToken(token, secret) {
  if (!token || !secret) return false
  const win  = Math.floor(Date.now() / (15 * 60 * 1000))
  const curr = crypto.createHmac('sha256', secret).update(String(win)).digest('hex')
  const prev = crypto.createHmac('sha256', secret).update(String(win - 1)).digest('hex')
  return safeEqual(token, curr) || safeEqual(token, prev)
}

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const appPasshash = process.env.APP_PASSHASH
  const apiSecret   = process.env.CLOUDINARY_API_SECRET
  const apiKey      = process.env.CLOUDINARY_API_KEY
  const cloudName   = process.env.CLOUDINARY_CLOUD_NAME
  const preset      = process.env.CLOUDINARY_UPLOAD_PRESET

  if (!appPasshash || !apiSecret || !apiKey || !cloudName || !preset) {
    console.error('api/cloudinary-sign: missing required env vars')
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  // Verify the session token issued by /api/verify-passphrase
  const token = req.headers['x-session-token'] || ''
  if (!isValidSessionToken(token, appPasshash)) {
    return res.status(401).json({ error: 'Unauthorized — valid session token required' })
  }

  // Generate the Cloudinary upload signature
  const timestamp = Math.round(Date.now() / 1000)
  const toSign    = `timestamp=${timestamp}&upload_preset=${preset}${apiSecret}`
  const signature = crypto.createHash('sha256').update(toSign).digest('hex')

  res.status(200).json({ signature, timestamp, apiKey, cloudName, preset })
}
