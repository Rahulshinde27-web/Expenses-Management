// Service Worker for ExpensePro
const CACHE_NAME = 'expensepro-v2.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/utils.js',
  '/scripts/auth.js',
  '/scripts/database.js',
  '/scripts/dashboard.js',
  '/scripts/transactions.js',
  '/scripts/admin.js',
  '/scripts/app.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js',
  'https://cdn.jsdelivr.net/npm/axios@1.1.2/dist/axios.min.js',
  'https://cdn.jsdelivr.net/npm/luxon@3.2.1/build/global/luxon.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If fetch fails, check if it's a navigation request
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Network error occurred', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Background sync for offline transactions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

async function syncTransactions() {
  // Get pending transactions from IndexedDB
  const pendingTransactions = await getPendingTransactions();
  
  // Try to sync each transaction
  for (const transaction of pendingTransactions) {
    try {
      // Attempt to send to server (if you have a backend)
      await sendTransactionToServer(transaction);
      
      // Update transaction status in IndexedDB
      await updateTransactionStatus(transaction.id, 'Synced');
    } catch (error) {
      console.error('Sync failed for transaction:', transaction.id, error);
    }
  }
}

// Message event for communication with clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Helper functions for background sync
async function getPendingTransactions() {
  // This would interact with IndexedDB
  // For now, return empty array
  return [];
}

async function sendTransactionToServer(transaction) {
  // This would send to your backend API
  // For standalone version, this is not needed
  return Promise.resolve();
}

async function updateTransactionStatus(id, status) {
  // Update transaction in IndexedDB
  return Promise.resolve();
}

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  
  const options = {
    body: data.body || 'New notification',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ExpensePro', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        if (windowClients.length > 0) {
          windowClients[0].focus();
          windowClients[0].postMessage({
            type: 'notification_click',
            data: event.notification.data
          });
        } else {
          clients.openWindow(event.notification.data.url || '/');
        }
      })
  );
});