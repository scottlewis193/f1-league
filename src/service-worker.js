import { precacheAndRoute } from 'workbox-precaching';

// Required for injectManifest
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
	console.log('[SW] installed');
});

// Push listener
self.addEventListener('push', (event) => {
	console.log('Push received!', event);
	const data = event.data?.json() || { title: 'Hello', body: 'Push message!' };
	event.waitUntil(
		self.registration.showNotification(data.title, {
			body: data.body,
			icon: data.icon,
			badge: data.badge,
			data: {
				url: data.url
			},
			actions: data.actions
		})
	);
});

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const defaultUrl = 'https://f1-league.hades.ws/';
	const urlToOpen = event.notification.data?.url || defaultUrl;

	if (urlToOpen) {
		event.waitUntil(
			clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
				// If a tab with the same URL is already open, focus it.
				for (const client of clientList) {
					if (client.url === urlToOpen && 'focus' in client) {
						return client.focus();
					}
				}
				// Otherwise, open a new tab.
				if (clients.openWindow) {
					return clients.openWindow(urlToOpen);
				}
			})
		);
	}
});
