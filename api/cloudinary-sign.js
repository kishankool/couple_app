// api/cloudinary-sign.js — Vercel Serverless Function
// Generates a signed upload signature so the Cloudinary API secret
// never needs to be exposed in the browser bundle.
//
// Auth: caller must supply the X-Session-Token header issued by
// /api/verify-passphrase after a successful passphrase check.
// Token is verified using SESSION_TOKEN_SECRET (not APP_PASSHASH).

import crypto from 'crypto'
// Shared token verifier — defined in api/_token.js (not an endpoint).
import { verifySessionToken } from './_token.js'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // SESSION_TOKEN_SECRET: used only for token verification, not for passphrase comparison
  const tokenSecret = process.env.SESSION_TOKEN_SECRET
  if (!tokenSecret) {
    console.error('api/cloudinary-sign: SESSION_TOKEN_SECRET env var is not set')
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const apiKey    = process.env.CLOUDINARY_API_KEY
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const preset    = process.env.CLOUDINARY_UPLOAD_PRESET

  if (!apiSecret || !apiKey || !cloudName || !preset) {
    console.error('api/cloudinary-sign: missing Cloudinary env vars')
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  // Verify the session token issued by /api/verify-passphrase
  const token = req.headers['x-session-token'] || ''
  if (!verifySessionToken(token, tokenSecret)) {
    return res.status(401).json({ error: 'Unauthorized — valid session token required' })
  }

  // Generate the Cloudinary upload signature
  const timestamp = Math.round(Date.now() / 1000)
  const toSign    = `timestamp=${timestamp}&upload_preset=${preset}${apiSecret}`
  const signature = crypto.createHash('sha256').update(toSign).digest('hex')

  res.status(200).json({ signature, timestamp, apiKey, cloudName, preset })
}
