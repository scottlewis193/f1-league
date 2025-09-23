import PocketBase from 'pocketbase';
import { PUBLIC_PB_URL } from '$env/static/public';
import { redirect, type ServerInit } from '@sveltejs/kit';
import { refreshF1DataHourly } from '$lib/server/data';

export const init: ServerInit = async () => {
	refreshF1DataHourly();
};

export const handle = async ({ event, resolve }) => {
	//get pb instance
	event.locals.pb = new PocketBase(PUBLIC_PB_URL);
	event.locals.pb.autoCancellation(false);

	// load the store data from the request cookie string
	event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');
	try {
		// get an up-to-date auth store state by verifying and refreshing the loaded auth model (if any)
		if (event.locals.pb.authStore.isValid) {
			await event.locals.pb.collection('users').authRefresh();
			event.locals.user = structuredClone(event.locals.pb.authStore.record);
		}
	} catch (_) {
		// clear the auth store on failed refresh
		event.locals.pb.authStore.clear();
		event.locals.user = null;
	}

	if (!event.locals.user) {
		console.log('not logged in');
		if (event.url.pathname !== '/login') {
			// redirect to login if not logged in
			throw redirect(303, '/login');
		}
	}

	const response = await resolve(event);

	// // send back the default 'pb_auth' cookie to the client with the latest store state
	response.headers.append(
		'set-cookie',
		event.locals.pb.authStore.exportToCookie({ sameSite: 'Lax', httpOnly: false })
	);

	return response;
};
