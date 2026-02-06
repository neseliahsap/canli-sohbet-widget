// ============================================
// SERVICE WORKER - PWA + PUSH NOTIFICATIONS
// ============================================

const CACHE_NAME = 'canli-sohbet-v1';
const urlsToCache = [
  '/canli-sohbet-widget/',
  '/canli-sohbet-widget/index.html',
  '/canli-sohbet-widget/admin-panel.js',
  '/canli-sohbet-widget/config.js',
  '/canli-sohbet-widget/widget.html',
  '/canli-sohbet-widget/widget.js'
];

// Install
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => caches.match('/canli-sohbet-widget/index.html'))
  );
});

// Push Notification
self.addEventListener('push', (event) => {
  let data = {
    title: 'Yeni Mesaj',
    body: 'Bir mesajınız var',
    icon: '/canli-sohbet-widget/icon-192x192.png',
    badge: '/canli-sohbet-widget/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'new-message',
    requireInteraction: true,
    data: { url: '/canli-sohbet-widget/index.html' },
    actions: [
      { action: 'open', title: 'Aç' },
      { action: 'close', title: 'Kapat' }
    ]
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, data)
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          for (let client of clientList) {
            if (client.url.includes('/canli-sohbet-widget/') && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow('/canli-sohbet-widget/index.html');
          }
        })
    );
  }
});
