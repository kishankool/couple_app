// api/notify.js — Vercel Serverless Function
// Receives a push notification request from the app and sends it to the partner's device
// The VAPID private key stays safely on the server, never exposed to the browser

import pkg from 'web-push'
const { sendNotification, setVapidDetails } = pkg

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { subscription, title, body, url } = req.body

  if (!subscription || !title) {
    return res.status(400).json({ error: 'Missing subscription or title' })
  }

  setVapidDetails(
    'mailto:notifications@kishanlovesaditi.online',
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  const payload = JSON.stringify({ title, body, url: url || '/' })

  try {
    await sendNotification(subscription, payload)
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Push error:', err)
    // Handle expired/invalid subscriptions gracefully
    res.status(err.statusCode === 410 ? 410 : 500).json({ error: err.message })
  }
}
