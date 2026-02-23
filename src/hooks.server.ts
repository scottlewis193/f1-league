import PocketBase from 'pocketbase';
import { PUBLIC_PB_URL } from '$env/static/public';
import { redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { checkForNewDeposits, refreshF1DataHourly } from '$lib/server/data';
import { dev } from '$app/environment';

export const init: ServerInit = async () => {
	refreshF1DataHourly();
	checkForNewDeposits();
};

export const handle: Handle = async ({ event, resolve }) => {
	console.log('Incoming request:', event.request.method, event.request.url);

	// --- Setup PocketBase ---
	event.locals.pb = new PocketBase(PUBLIC_PB_URL);
	event.locals.pb.autoCancellation(false);
	event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

	// --- Verify auth if exists ---
	try {
		if (event.locals.pb.authStore.isValid) {
			await event.locals.pb.collection('users').authRefresh();
			event.locals.user = structuredClone(event.locals.pb.authStore.record);
		} else {
			event.locals.user = null;
		}
	} catch (err) {
		console.error('Error refreshing auth:', err);
		event.locals.pb.authStore.clear();
		event.locals.user = null;
	}

	const response = await resolve(event);
	// --- Persist cookie ---
	response.headers.set(
		'set-cookie',
		event.locals.pb.authStore.exportToCookie({ httpOnly: false, sameSite: 'lax', secure: !dev })
	);

	return response;
};
