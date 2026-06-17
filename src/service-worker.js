/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST || []);

// Push listener
self.addEventListener('push', (event) => {
	let data = {};
	if (event.data) {
		try {
			data = event.data.json() || {};
		} catch (err) {
			console.error('[SW] Failed to parse push data:', err);
			data = { title: 'F1 League', body: 'New notification' };
		}
	}

	const title = data.title || 'F1 League';
	const options = {
		body: data.body || 'New notification',
		icon: data.icon || '/logo.png',
		badge: data.badge || '/badge.png',
		tag: data.tag,
		data: {
			...(data.data || {}),
			url: data.url || data.data?.url || '/'
		},
		actions: data.actions || []
	};

	event.waitUntil(
		self.registration.showNotification(title, options).catch((err) => {
			console.error('[SW] Failed to show notification:', err);
		})
	);
});

// Message listener (for skip waiting)
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

	event.waitUntil(
		self.clients
			.matchAll({ type: 'window', includeUncontrolled: true })
			.then((clientList) => {
				// If app is already open, focus it
				for (const client of clientList) {
					if (client.url === urlToOpen && 'focus' in client) {
						return client.focus();
					}
				}
				// Otherwise open a new window
				if (self.clients.openWindow) {
					return self.clients.openWindow(urlToOpen);
				}
			})
			.catch((err) => {
				console.error('[SW] Failed to open window:', err);
			})
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});
