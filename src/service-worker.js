/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';

const worker = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));
const CACHE = `f1-league-${version}`;
const ASSETS = [...build, ...files];

worker.addEventListener('install', (event) => {
	console.log('[SW] installed');
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => worker.skipWaiting())
	);
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => worker.clients.claim())
	);
});

worker.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	event.respondWith(
		caches.match(event.request).then((cached) => {
			return cached || fetch(event.request);
		})
	);
});

// Push listener
worker.addEventListener('push', (event) => {
	console.log('Push received!', event);
	const data = event.data?.json() || { title: 'Hello', body: 'Push message!' };
	event.waitUntil(
		worker.registration.showNotification(data.title, {
			body: data.body,
			icon: data.icon || '/logo.png',
			badge: data.badge || '/logo.png',
			data: {
				url: data.url
			},
			actions: data.actions
		})
	);
});

worker.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		worker.skipWaiting();
	}
});

worker.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const defaultUrl = 'https://f1-league.hades.ws/';
	const urlToOpen = event.notification.data?.url || defaultUrl;

	if (urlToOpen) {
		event.waitUntil(
			worker.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
				for (const client of clientList) {
					if (client.url === urlToOpen && 'focus' in client) {
						return client.focus();
					}
				}
				if (worker.clients.openWindow) {
					return worker.clients.openWindow(urlToOpen);
				}
			})
		);
	}
});
