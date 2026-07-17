// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
    console.log('📦 Service Worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('⚡ Service Worker activated');
    event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
    console.log('🔔 Push notification received:', event);
    
    let data = {
        title: 'Sweeping Rota',
        body: 'Time to sweep the room!',
        icon: '/icon-192x192.png',
        badge: '/badge-96x96.png',
        data: {
            url: '/'
        }
    };

    if (event.data) {
        try {
            const parsed = event.data.json();
            data = { ...data, ...parsed };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icon-192x192.png',
        badge: data.badge || '/badge-96x96.png',
        vibrate: [200, 100, 200],
        data: data.data || { url: '/' },
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: '📱 Open App'
            },
            {
                action: 'swept',
                title: '✅ Mark as Swept'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Notification clicked:', event);
    
    event.notification.close();

    const action = event.action;
    const url = event.notification.data?.url || '/';

    if (action === 'swept') {
        // Mark as swept action
        event.waitUntil(
            fetch('/api/rota/swept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    rotaId: event.notification.data?.rotaId || 1 
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success notification
                    self.registration.showNotification('✅ Swept!', {
                        body: 'Room marked as swept! Great job! 🎉',
                        icon: '/icon-192x192.png'
                    });
                }
            })
        );
    }

    // Open the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                if (clientList.length > 0) {
                    return clientList[0].navigate(url);
                }
                return clients.openWindow(url);
            })
    );
});