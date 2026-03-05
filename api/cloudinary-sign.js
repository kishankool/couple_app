// api/cloudinary-sign.js — Vercel Serverless Function
// Generates a signed upload signature so the Cloudinary API secret
// never needs to be exposed in the browser bundle.
import crypto from 'crypto'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const apiKey    = process.env.CLOUDINARY_API_KEY
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const preset    = process.env.CLOUDINARY_UPLOAD_PRESET

  if (!apiSecret || !apiKey || !cloudName || !preset) {
    console.error('Cloudinary env vars missing')
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  const timestamp = Math.round(Date.now() / 1000)

  // Signature = SHA-256( "timestamp=<ts>&upload_preset=<preset><api_secret>" )
  const toSign    = `timestamp=${timestamp}&upload_preset=${preset}${apiSecret}`
  const signature = crypto.createHash('sha256').update(toSign).digest('hex')

  res.status(200).json({ signature, timestamp, apiKey, cloudName, preset })
}
