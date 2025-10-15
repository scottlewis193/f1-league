import PocketBase from 'pocketbase';
import { PUBLIC_PB_URL } from '$env/static/public';
import { redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { refreshF1DataHourly } from '$lib/server/data';

export const init: ServerInit = async () => {
	refreshF1DataHourly();
};

export const handle: Handle = async ({ event, resolve }) => {
	try {
		console.log('Incoming request:', event.request.method, event.request.url);

		// --- Setup PocketBase ---
		event.locals.pb = new PocketBase(PUBLIC_PB_URL);
		event.locals.pb.autoCancellation(false);
		event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

		// --- Verify auth if exists ---
		if (event.locals.pb.authStore.isValid) {
			await event.locals.pb.collection('users').authRefresh();
			event.locals.user = structuredClone(event.locals.pb.authStore.record);
		} else {
			event.locals.user = null;
		}

		const url = new URL(event.request.url);
		const isLoginPage = url.pathname === '/login';
		const hasEphemeralToken = url.searchParams.has('token');
		const ua = event.request.headers.get('user-agent') || '';
		const isPhantomBrowser = /Phantom/i.test(ua);
		const isWalletRoute = url.pathname.startsWith('/wallet');
		const isPhantomReturn = url.pathname.startsWith('/phantom-return');
		const allowedUnauthed =
			isLoginPage || isWalletRoute || isPhantomReturn || hasEphemeralToken || isPhantomBrowser;

		if (!event.locals.user && !allowedUnauthed) {
			console.log('Redirecting unauthenticated user to /login');
			throw redirect(303, '/login');
		}

		// --- Only redirect normal browsers without auth ---
		if (!event.locals.user && !allowedUnauthed) {
			console.log('Redirecting unauthenticated user to /login');
			throw redirect(303, '/login');
		}

		const response = await resolve(event);

		// --- Persist cookie ---
		response.headers.append(
			'set-cookie',
			event.locals.pb.authStore.exportToCookie({
				sameSite: 'Lax',
				httpOnly: false
			})
		);

		return response;
	} catch (err: any) {
		if ('status' in err && 'location' in err && err.status >= 300 && err.status < 400) {
			throw err;
		}

		console.error('Top-level handle() error:', err);
		return new Response('Internal server error', { status: 500 });
	}
};
