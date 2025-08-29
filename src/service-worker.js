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
	event.waitUntil(self.registration.showNotification(data.title, { body: data.body }));
});

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});
