import { getRequestEvent, query } from '$app/server';
import type { OddsRecord } from '$lib/types';
import { getNextRace } from './races.remote';

export const getOdds = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	let odds: OddsRecord[] = await pb.collection('odds').getFullList({ expand: 'driver,race' });
	return odds;
});

export const getNextRaceOdds = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	const race = (await getNextRace()).id;
	let odds: OddsRecord[] = await pb
		.collection('odds')
		.getFullList({ expand: 'driver,race', filter: `race='${race}'` });
	return odds;
});
