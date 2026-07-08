// Disables access to DOM typings like `HTMLElement` which are not available
// inside a service worker and instantiates the correct globals
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Ensures that the `$service-worker` import has proper type definitions
/// <reference types="@sveltejs/kit" />

// Only necessary if you have an import from `$env/static/public`
/// <reference types="../.svelte-kit/ambient.d.ts" />

import { build, files, version } from '$service-worker';

// This gives `self` the correct types
const self = globalThis.self as unknown as ServiceWorkerGlobalScope;

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

const ASSETS = [
	...build, // the app itself
	...files // everything in `static`
];

self.addEventListener('install', (event) => {
	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	// Remove previous cached data from disk
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	// ignore POST requests etc
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// `build`/`files` can always be served from the cache
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);

			if (response) {
				return response;
			}
		}

		// for everything else, try the network first, but
		// fall back to the cache if we're offline
		try {
			const response = await fetch(event.request);

			// if we're offline, fetch can return a value that is not a Response
			// instead of throwing - and we can't pass this non-Response to respondWith
			if (!(response instanceof Response)) {
				throw new Error('invalid response from fetch');
			}

			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch (err) {
			const response = await cache.match(event.request);

			if (response) {
				return response;
			}

			// if there's no cache, then just error out
			// as there is nothing we can do to respond to this request
			throw err;
		}
	}

	event.respondWith(respond());
});

// type PushNotificationData = {
// 	title?: string;
// 	body?: string;
// 	icon?: string;
// 	badge?: string;
// 	tag?: string;
// 	data?: Record<string, unknown>;
// 	actions?: Array<{ action: string; title: string }>;
// 	url?: string;
// };

// // Push listener
// self.addEventListener('push', (event) => {
// 	let data: PushNotificationData = {};
// 	if (event.data) {
// 		try {
// 			data = event.data.json() || {};
// 		} catch (err) {
// 			console.error('[SW] Failed to parse push data:', err);
// 			data = { title: 'F1 League', body: 'New notification' };
// 		}
// 	}

// 	const title = data.title || 'F1 League';
// 	const options = {
// 		body: data.body || 'New notification',
// 		icon: data.icon || '/logo.png',
// 		badge: data.badge || '/badge.png',
// 		tag: data.tag,
// 		data: {
// 			...(data.data || {}),
// 			url: data.url || data.data?.url || '/'
// 		},
// 		actions: data.actions || []
// 	};

// 	event.waitUntil(
// 		self.registration.showNotification(title, options).catch((err) => {
// 			console.error('[SW] Failed to show notification:', err);
// 		})
// 	);
// });

// // Message listener (for skip waiting)
// self.addEventListener('message', (event) => {
// 	if (event.data && event.data.type === 'SKIP_WAITING') {
// 		self.skipWaiting();
// 	}
// });

// // Notification click handler
// self.addEventListener('notificationclick', (event) => {
// 	event.notification.close();

// 	const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

// 	event.waitUntil(
// 		self.clients
// 			.matchAll({ type: 'window', includeUncontrolled: true })
// 			.then((clientList) => {
// 				// If app is already open, focus it
// 				for (const client of clientList) {
// 					if (client.url === urlToOpen && 'focus' in client) {
// 						return client.focus();
// 					}
// 				}
// 				// Otherwise open a new window
// 				if (self.clients.openWindow) {
// 					return self.clients.openWindow(urlToOpen);
// 				}
// 			})
// 			.catch((err) => {
// 				console.error('[SW] Failed to open window:', err);
// 			})
// 	);
// });
