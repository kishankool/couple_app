// Service Worker for Kishan & Aditi PWA
// Enables: Add to Home Screen, offline splash, Web Push notifications

const CACHE_NAME = 'ka-app-v4'

// On install — skip waiting so new SW activates immediately
self.addEventListener('install', () => self.skipWaiting())

// On activate — claim all clients and remove old caches
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys =>
    Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )
  ).then(() => clients.claim())
))

// Fetch — network first, fall back to cache for navigation requests
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (e.request.mode === 'navigate') {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        }
        return res
      })
      .catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match(e.request).then(cached => cached || caches.match('/'))
        }
      })
  )
})

// ── Push notification handler ──
self.addEventListener('push', e => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title || 'Kishan & Aditi 💕', {
      body:    data.body    || 'Something new is waiting for you 🌸',
      icon:    '/icon.png',
      badge:   '/icon.png',
      vibrate: [200, 100, 200],
      data:    { url: data.url || '/' },
      tag:     'ka-push',
      renotify: true,
    })
  )
})

// ── Notification click — open/focus the app ──
self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async list => {
      const url = e.notification.data?.url || '/'
      for (const client of list) {
        if ('focus' in client) {
          await client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
