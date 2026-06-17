import PocketBase from 'pocketbase';
import { env as publicEnv } from '$env/dynamic/public';
import { env } from '$env/dynamic/private';
import { redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { checkForNewDeposits, refreshF1DataHourly } from '$lib/server/data';
import { dev, building } from '$app/environment';

export const init: ServerInit = async () => {
	if (building) return; // ← skip entirely during `vite build`

	if (env.RUN_BACKGROUND_JOBS !== 'true') {
		console.log('Background jobs disabled. Set RUN_BACKGROUND_JOBS=true on one worker to enable them.');
		return;
	}

	refreshF1DataHourly();
	checkForNewDeposits();
};

export const handle: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event); // ← skip during `vite build`

	console.log('Incoming request:', event.request.method, event.request.url);

	// --- Setup PocketBase ---
	const pbUrl = publicEnv.PUBLIC_PB_URL;
	if (!pbUrl) {
		throw new Error(
			'PocketBase URL is not configured. Set PUBLIC_PB_URL runtime environment variable.'
		);
	}

	event.locals.pb = new PocketBase(pbUrl);
	event.locals.pb.autoCancellation(false);
	event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

	// --- Verify auth if exists ---
	try {
		if (event.locals.pb.authStore.isValid) {
			await event.locals.pb.collection('users').authRefresh();
			event.locals.user = structuredClone(event.locals.pb.authStore.record);
		} else {
			event.locals.user = null;
			// Allow unauthenticated access to notification API endpoints
			const publicPaths = [
				'/login',
				'/api/notifications',
				'/api/subscribe',
				'/.well-known'
			];
			if (!publicPaths.some((path) => event.request.url.includes(path))) {
				redirect(308, '/login');
			}
		}
	} catch (err) {
		console.error('Error refreshing auth:', err);
		event.locals.pb.authStore.clear();
		event.locals.user = null;
		if (!event.request.url.includes('/login')) redirect(308, '/login');
	}

	const response = await resolve(event);

	// --- Persist cookie ---
	response.headers.set(
		'set-cookie',
		event.locals.pb.authStore.exportToCookie({ httpOnly: false, sameSite: 'lax', secure: !dev })
	);

	return response;
};
