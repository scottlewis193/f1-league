import PocketBase from 'pocketbase';
import { env as publicEnv } from '$env/dynamic/public';
import { env } from '$env/dynamic/private';
import { redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { checkForNewDeposits, refreshF1DataHourly } from '$lib/server/data';
import { shouldRefreshAuth } from '$lib/server/auth';
import { dev, building } from '$app/environment';

export const init: ServerInit = async () => {
	if (building) return; // ← skip entirely during `vite build`

	refreshF1DataHourly();
	checkForNewDeposits();
};

export const handle: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event); // ← skip during `vite build`

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
			if (shouldRefreshAuth(event.locals.pb.authStore.token)) {
				await event.locals.pb.collection('users').authRefresh();
			}
			event.locals.user = structuredClone(event.locals.pb.authStore.record);
		} else {
			event.locals.user = null;
			// Allow unauthenticated access to notification API endpoints
			const publicPaths = ['/login', '/api/notifications', '/api/subscribe', '/.well-known'];
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

	// The browser SDK still needs to read this cookie for authenticated wallet
	// reads and realtime subscriptions, so httpOnly cannot be enabled yet.
	response.headers.set(
		'content-security-policy',
		"base-uri 'self'; frame-ancestors 'none'; object-src 'none'"
	);
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');

	// --- Persist cookie ---
	response.headers.set(
		'set-cookie',
		event.locals.pb.authStore.exportToCookie({
			httpOnly: false,
			sameSite: 'lax',
			secure: !dev,
			path: '/'
		})
	);

	return response;
};
