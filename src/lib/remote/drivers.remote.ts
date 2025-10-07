import { getRequestEvent, query } from '$app/server';
import { getDriversDb } from '$lib/server/data';

export const getDrivers = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	return getDriversDb(pb);
});
