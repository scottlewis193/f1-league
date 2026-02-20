import { getRequestEvent, query } from '$app/server';

export const getPbInstance = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	console.log('test');
	return pb;
});
