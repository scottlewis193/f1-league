import { env as publicEnv } from '$env/dynamic/public';
import { withTimeout } from '$lib/utils';

function urlBase64ToUint8Array(base64String: string) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function arrayBuffersEqual(a: ArrayBuffer | null, b: Uint8Array) {
	if (!a || a.byteLength !== b.byteLength) return false;
	const aBytes = new Uint8Array(a);
	return aBytes.every((byte, index) => byte === b[index]);
}

function toArrayBuffer(bytes: Uint8Array) {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function subscribeToPush(userId?: string) {
	if (!('serviceWorker' in navigator)) {
		console.warn('Push notifications are unavailable: service workers are not supported by this browser.');
		return;
	}

	if (!('PushManager' in window)) {
		console.warn('Push notifications are unavailable: PushManager is not supported by this browser.');
		return;
	}

	if (!('Notification' in window)) {
		console.warn('Push notifications are unavailable: the Notification API is not supported by this browser.');
		return;
	}

	const publicKey = publicEnv.PUBLIC_VAPID_PUBLIC_KEY;
	if (!publicKey) {
		console.error('PUBLIC_VAPID_PUBLIC_KEY is not configured');
		return;
	}

	const permission = await Notification.requestPermission();
	if (permission !== 'granted') return;

	const registration = await withTimeout(
		navigator.serviceWorker.ready,
		10000,
		'Timed out waiting for service worker registration.'
	).catch((error) => {
		console.warn('Push notifications are unavailable:', error);
		return null;
	});
	if (!registration) return;

	let applicationServerKey: Uint8Array;
	try {
		applicationServerKey = urlBase64ToUint8Array(publicKey.trim());
	} catch (error) {
		console.error('Failed to decode VAPID public key:', error);
		return;
	}

	let subscription = await registration.pushManager.getSubscription();

	if (
		subscription?.options.applicationServerKey &&
		!arrayBuffersEqual(subscription.options.applicationServerKey, applicationServerKey)
	) {
		await subscription.unsubscribe();
		subscription = null;
	}

	if (!subscription) {
		try {
			subscription = await withTimeout(
				registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: toArrayBuffer(applicationServerKey)
				}),
				15000,
				'Timed out creating push subscription. This browser may not support Web Push, or it may be unable to reach its push service.'
			);
		} catch (error) {
			console.warn('Push notifications are unavailable:', error);
			return;
		}
	}

	const response = await fetch('/api/subscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ...subscription.toJSON(), userId })
	});

	if (!response.ok) {
		const result = await response.json().catch(() => null);
		console.error('Failed to store push subscription:', response.status, result);
		throw new Error(`Failed to store push subscription: ${response.status} ${response.statusText}`);
	}
}
