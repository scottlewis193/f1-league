// For dev mode (HTTP), manually register SW with gcm_sender_id in manifest
export async function registerSWDev() {
	if (typeof window === 'undefined' || window.location.protocol !== 'http:') return;

	try {
		// Register the built service worker in dev too.
		const reg = await navigator.serviceWorker.register('/service-worker.js', {
			scope: '/',
			type: 'module',
			updateViaCache: 'none'
		});

		// Chromium Web Push in dev requires the GCM sender id in the manifest.
		const manifestResp = await fetch('/manifest.webmanifest');
		const manifestJson = await manifestResp.json();
		if (!manifestJson.gcm_sender_id) {
			console.warn('Push notifications may not work in Chromium browsers: manifest is missing gcm_sender_id.');
		}
		return reg;
	} catch (err) {
		console.error('Failed to register SW in dev mode:', err);
	}
}
