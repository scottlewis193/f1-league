import { getRequestEvent, query } from '$app/server';
import type { Driver } from '$lib/types';

export const getDrivers = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;

	let drivers: Driver[] = await pb.collection('drivers').getFullList({ sort: '-points' });

	return drivers;
});
