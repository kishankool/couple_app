// api/razorpay-cancel-mandate.js — Cancel a Razorpay subscription/mandate

import { verifySessionToken } from './_token.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verify session token
  const tokenSecret = process.env.SESSION_TOKEN_SECRET
  const sessionToken = req.headers['x-session-token']
  if (!tokenSecret || !verifySessionToken(sessionToken, tokenSecret)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const rzpKeyId = process.env.RAZORPAY_KEY_ID
  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET
  if (!rzpKeyId || !rzpKeySecret) {
    return res.status(500).json({ error: 'Payment gateway not configured' })
  }

  const { subscriptionId } = req.body || {}
  if (!subscriptionId) {
    return res.status(400).json({ error: 'Missing subscriptionId' })
  }

  const auth = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64')

  try {
    const cancelRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancel_at_cycle_end: 0 }), // Cancel immediately
    })

    if (!cancelRes.ok) {
      const err = await cancelRes.json()
      return res.status(cancelRes.status).json({ error: 'Failed to cancel', details: err })
    }

    const result = await cancelRes.json()

    return res.status(200).json({
      ok: true,
      status: result.status,
      message: 'Mandate cancelled successfully',
    })
  } catch (err) {
    console.error('Razorpay cancel error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
