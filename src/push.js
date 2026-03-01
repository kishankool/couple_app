// src/push.js
// Web Push subscription helpers — works with the Vercel /api/notify endpoint

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
const PUSH_API_KEY     = import.meta.env.VITE_PUSH_API_KEY

// Only allow known owner names — prevents Firestore path injection
const ALLOWED_USERS = new Set(['Kishan', 'Aditi'])

function validateWho(who) {
  if (typeof who !== 'string') return false
  if (!ALLOWED_USERS.has(who)) return false
  return true
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

// Register the service worker and subscribe to push
export async function subscribeToPush(who) {
  if (!validateWho(who)) {
    console.warn('subscribeToPush: invalid who value:', who)
    return null
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VITE_VAPID_PUBLIC_KEY not set — push disabled')
    return null
  }

  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    // Save subscription to Firestore, keyed by the validated user name
    const { fsSet } = await import('./firebase')
    await fsSet('push_subs', who, { subscription: JSON.parse(JSON.stringify(sub)), who })
    return sub
  } catch (err) {
    console.warn('Push subscription failed:', err)
    return null
  }
}

// Send a push to the partner via the Vercel serverless API
export async function notifyPartner(who, { title, body, url = '/' }) {
  if (!validateWho(who)) {
    console.warn('notifyPartner: invalid who value:', who)
    return
  }

  const partnerName = who === 'Kishan' ? 'Aditi' : 'Kishan'

  try {
    const { db } = await import('./firebase')
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(db, 'push_subs', partnerName))
    if (!snap.exists()) return // partner hasn't enabled push yet

    const { subscription } = snap.data()

    const headers = { 'Content-Type': 'application/json' }
    if (PUSH_API_KEY) headers['X-Push-Token'] = PUSH_API_KEY

    const res = await fetch('/api/notify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ subscription, title, body, url }),
    })

    if (res.status === 410) {
      // Subscription expired — clean it up from Firestore
      const { fsDelete } = await import('./firebase')
      await fsDelete('push_subs', partnerName)
    }
  } catch (err) {
    console.warn('notifyPartner error:', err)
  }
}
