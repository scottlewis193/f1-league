import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';
import pb from './pocketbase';

function urlBase64ToUint8Array(base64String: string) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush() {
	if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

	const permission = await Notification.requestPermission();
	if (permission !== 'granted') return;

	const registration = await navigator.serviceWorker.ready;

	// Unsubscribe old subscription
	const existing = await registration.pushManager.getSubscription();
	if (existing) {
		await existing.unsubscribe();
		//remove from db
		const record = await pb
			.collection('subscriptions')
			.getFirstListItem(`endpoint="${existing.endpoint}"`);
		await pb.collection('subscriptions').delete(record.id);

		console.log('Old push subscription removed');
	}

	const applicationServerKey = urlBase64ToUint8Array(PUBLIC_VAPID_PUBLIC_KEY);

	const subscription = await registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey
	});

	console.log('Push subscription created:', subscription);

	// Send to backend if needed
	await fetch('/api/subscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(subscription)
	});
}
