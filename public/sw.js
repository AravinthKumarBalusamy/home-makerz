const CACHE_NAME = 'homemakerz-v3';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/api.js',
    '/js/utils.js',
    '/js/dashboard.js',
    '/js/tasks.js',
    '/js/budget.js',
    '/js/expenses.js',
    '/js/income.js',
    '/js/goals.js',
    '/js/kids.js',
    '/js/notes.js',
    '/js/savings.js',
    '/js/reports.js',
    '/js/settings.js',
    '/js/bills.js',
    '/manifest.json'
];

// Install — cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch — cache-first for static, network-only for auth, network-first for API
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Never cache auth routes
    if (url.pathname.startsWith('/api/auth/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    if (url.pathname.startsWith('/api/')) {
        // Network-first for API calls
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(event.request))
        );
    } else {
        // Cache-first for static assets
        event.respondWith(
            caches.match(event.request)
                .then(cached => cached || fetch(event.request))
        );
    }
});
