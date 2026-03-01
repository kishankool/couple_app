// api/notify.js — Vercel Serverless Function
// Receives a push notification request from the app and sends it to the partner's device.
// The VAPID private key stays safely on the server, never exposed to the browser.

import pkg from 'web-push'
const { sendNotification, setVapidDetails } = pkg

// Simple shared-secret auth: the client must send X-Push-Token matching PUSH_API_KEY env var.
// Set PUSH_API_KEY to any random strong string (e.g. output of `openssl rand -hex 32`).
function isAuthorized(req) {
  const apiKey = process.env.PUSH_API_KEY
  if (!apiKey) return false // Refuse all if key not configured
  return req.headers['x-push-token'] === apiKey
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Auth check — must come before reading body
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Guard: body must exist and have required fields
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const { subscription, title, body, url } = req.body

  if (!subscription || !title) {
    return res.status(400).json({ error: 'Missing subscription or title' })
  }

  // Guard: VAPID env vars must be set
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

    const payload = JSON.stringify({ title, body, url: url || '/' })
    await sendNotification(subscription, payload)
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Push error:', err)
    // 410 = subscription expired/invalid — caller should clean it up
    res.status(err.statusCode === 410 ? 410 : 500).json({ error: err.message })
  }
}
