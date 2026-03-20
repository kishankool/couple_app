// api/razorpay-mandate-status.js — Get subscription/mandate status
// Fetches the current status of a Razorpay subscription and its recent payments.

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
    // Fetch subscription details
    const subRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}`, {
      headers: { 'Authorization': `Basic ${auth}` },
    })

    if (!subRes.ok) {
      const err = await subRes.json()
      return res.status(subRes.status).json({ error: 'Failed to fetch subscription', details: err })
    }

    const subscription = await subRes.json()

    // Fetch recent invoices/payments for this subscription
    const invRes = await fetch(`https://api.razorpay.com/v1/invoices?subscription_id=${subscriptionId}&count=30`, {
      headers: { 'Authorization': `Basic ${auth}` },
    })

    let payments = []
    if (invRes.ok) {
      const invData = await invRes.json()
      payments = (invData.items || []).map(inv => ({
        id: inv.id,
        amount: inv.amount / 100,
        status: inv.status,
        date: inv.paid_at ? new Date(inv.paid_at * 1000).toISOString() : inv.created_at ? new Date(inv.created_at * 1000).toISOString() : null,
      }))
    }

    return res.status(200).json({
      ok: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentStart: subscription.current_start ? new Date(subscription.current_start * 1000).toISOString() : null,
        currentEnd: subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null,
        totalCount: subscription.total_count,
        paidCount: subscription.paid_count,
        remainingCount: subscription.remaining_count,
        shortUrl: subscription.short_url,
        planId: subscription.plan_id,
        notes: subscription.notes,
      },
      payments,
    })
  } catch (err) {
    console.error('Razorpay status fetch error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
