// api/razorpay-webhook.js — Handle Razorpay webhook events
// Processes payment success, failure, and subscription status changes.

import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET not configured')
    return res.status(500).end()
  }

  // Verify webhook signature
  const receivedSig = req.headers['x-razorpay-signature']
  if (!receivedSig) {
    return res.status(400).json({ error: 'Missing signature' })
  }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex')

  try {
    const r = Buffer.from(receivedSig, 'hex')
    const e = Buffer.from(expectedSig, 'hex')
    if (r.length !== e.length || !crypto.timingSafeEqual(r, e)) {
      console.warn('Webhook signature mismatch')
      return res.status(400).json({ error: 'Invalid signature' })
    }
  } catch {
    return res.status(400).json({ error: 'Invalid signature format' })
  }

  const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const eventType = event.event

  // Log webhook events (in production, store these in Firestore)
  console.log(`[Razorpay Webhook] Event: ${eventType}`, JSON.stringify(event.payload, null, 2))

  switch (eventType) {
    case 'subscription.authenticated':
      // UPI mandate has been authenticated by the user
      console.log('✅ Mandate authenticated:', event.payload?.subscription?.entity?.id)
      break

    case 'subscription.activated':
      // Subscription is now active and will start charging
      console.log('✅ Subscription activated:', event.payload?.subscription?.entity?.id)
      break

    case 'subscription.charged':
      // A payment was successfully charged
      const payment = event.payload?.payment?.entity
      console.log('💰 Payment charged:', {
        amount: payment?.amount / 100,
        subscriptionId: event.payload?.subscription?.entity?.id,
        paymentId: payment?.id,
      })
      break

    case 'subscription.pending':
      // Payment is pending (retry will happen)
      console.log('⏳ Payment pending:', event.payload?.subscription?.entity?.id)
      break

    case 'subscription.halted':
      // Subscription halted due to repeated failures
      console.log('⚠️ Subscription halted:', event.payload?.subscription?.entity?.id)
      break

    case 'subscription.cancelled':
      console.log('❌ Subscription cancelled:', event.payload?.subscription?.entity?.id)
      break

    default:
      console.log(`📋 Unhandled event: ${eventType}`)
  }

  // Always return 200 to acknowledge receipt
  return res.status(200).json({ ok: true })
}
