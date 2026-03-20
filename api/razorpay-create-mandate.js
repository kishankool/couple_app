// api/razorpay-create-mandate.js — Create a Razorpay UPI Autopay Subscription
// Creates a recurring payment mandate for ₹50/day via UPI Autopay.

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
    console.error('Razorpay credentials not configured')
    return res.status(500).json({ error: 'Payment gateway not configured' })
  }

  const { who, amount = 5000 } = req.body || {} // amount in paise (₹50 = 5000 paise)
  if (!who || !['Kishan', 'Aditi'].includes(who)) {
    return res.status(400).json({ error: 'Invalid user' })
  }

  const auth = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64')

  try {
    // Step 1: Create a Plan (daily ₹50)
    const planRes = await fetch('https://api.razorpay.com/v1/plans', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        period: 'daily',
        interval: 1,
        item: {
          name: `${who}'s Daily SIP - ₹${amount / 100}`,
          amount: amount,
          currency: 'INR',
          description: `Daily savings of ₹${amount / 100} for ${who}`,
        },
      }),
    })

    if (!planRes.ok) {
      const err = await planRes.json()
      console.error('Razorpay plan creation failed:', err)
      return res.status(500).json({ error: 'Failed to create plan', details: err })
    }

    const plan = await planRes.json()

    // Step 2: Create a Subscription on the plan
    const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: plan.id,
        total_count: 365, // 1 year of daily payments
        quantity: 1,
        customer_notify: 1,
        notes: {
          who: who,
          app: 'couple_app',
          purpose: 'daily_sip_savings',
        },
      }),
    })

    if (!subRes.ok) {
      const err = await subRes.json()
      console.error('Razorpay subscription creation failed:', err)
      return res.status(500).json({ error: 'Failed to create subscription', details: err })
    }

    const subscription = await subRes.json()

    return res.status(200).json({
      ok: true,
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      status: subscription.status,
      planId: plan.id,
    })
  } catch (err) {
    console.error('Razorpay mandate creation error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
