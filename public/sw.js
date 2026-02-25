// Service Worker for Kishan & Aditi PWA
// Enables: Add to Home Screen, offline splash, push notifications

const CACHE_NAME = 'ka-app-v2'

// On install — skip waiting so new SW activates immediately
self.addEventListener('install', () => self.skipWaiting())

// On activate — claim all clients
self.addEventListener('activate', e => e.waitUntil(clients.claim()))

// Fetch — network first, fall back to cache for navigation requests
self.addEventListener('fetch', e => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful navigation responses for offline splash
        if (e.request.mode === 'navigate') {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        }
        return res
      })
      .catch(() => {
        // Offline fallback for navigation
        if (e.request.mode === 'navigate') {
          return caches.match(e.request).then(cached => cached || caches.match('/'))
        }
      })
  )
})

// Push notification handler (for future server-sent pushes)
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'Kishan & Aditi 💕', {
      body:    data.body    || 'A new update is waiting for you 🌸',
      icon:    '/heart.svg',
      badge:   '/heart.svg',
      vibrate: [200, 100, 200],
      data:    { url: data.url || '/' },
    })
  )
})

// Notification click — open the app
self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url === '/' && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(e.notification.data?.url || '/')
    })
  )
})
