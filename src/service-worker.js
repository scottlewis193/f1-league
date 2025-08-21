// import { precacheAndRoute } from 'workbox-precaching';

// // This line is required for injectManifest to work
// precacheAndRoute(self.__WB_MANIFEST);

// self.addEventListener('install', () => {
// 	console.log('[SW] Service Worker installed');
// });
// self.addEventListener('activate', () => {
// 	console.log('[SW] Service Worker activated');
// });

// //@ts-ignore
// self.addEventListener('push', (event) => {
// 	console.log('push event!');
// 	let data = {
// 		title: 'Default Title',
// 		body: 'Default Body'
// 	};
// 	if (event.data) {
// 		try {
// 			data = event.data.json();
// 		} catch (err) {
// 			console.error('Error parsing push event data:', err);
// 		}
// 	}

// 	event.waitUntil(
// 		//@ts-ignore
// 		self.registration.showNotification(data.title, {
// 			body: data.body
// 		})
// 	);
// });

import { precacheAndRoute } from 'workbox-precaching';

// Required for injectManifest
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => console.log('[SW] installed'));
self.addEventListener('activate', () => console.log('[SW] activated'));

// Push listener
self.addEventListener('push', (event) => {
	console.log('Push received!', event);
	const data = event.data?.json() || { title: 'Hello', body: 'Push message!' };
	event.waitUntil(self.registration.showNotification(data.title, { body: data.body }));
});
