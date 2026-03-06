// api/_token.js — shared session token helpers
// Prefixed with _ so Vercel does NOT expose this as an endpoint.
//
// Token format: <base64url(JSON{nonce,exp})>.<base64url(HMAC-SHA256)>
//   nonce — 16 random bytes so every token is unique
//   exp   — Unix epoch seconds when the token expires

import crypto from 'crypto'

const TOKEN_TTL_MS = 15 * 60 * 1000  // 15 minutes

export function makeSessionToken(secret) {
  const payload = JSON.stringify({
    nonce: crypto.randomBytes(16).toString('hex'),
    exp:   Math.floor((Date.now() + TOKEN_TTL_MS) / 1000),
  })
  const payloadB64 = Buffer.from(payload).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}

export function verifySessionToken(token, secret) {
  if (typeof token !== 'string' || !token) return false
  const dot = token.lastIndexOf('.')
  if (dot < 1) return false
  const payloadB64  = token.slice(0, dot)
  const receivedSig = token.slice(dot + 1)

  // Constant-time signature check
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url')
  try {
    const r = Buffer.from(receivedSig, 'base64url')
    const e = Buffer.from(expectedSig, 'base64url')
    if (r.length !== e.length || !crypto.timingSafeEqual(r, e)) return false
  } catch {
    return false
  }

  // Expiry check
  try {
    const { exp } = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
    return typeof exp === 'number' && Math.floor(Date.now() / 1000) < exp
  } catch {
    return false
  }
}
