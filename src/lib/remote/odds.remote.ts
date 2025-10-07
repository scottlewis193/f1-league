import { getRequestEvent, query } from '$app/server';
import { getNextRaceOddsDb, getOddsDb } from '$lib/server/data';

export const getOdds = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	return getOddsDb(pb);
});

export const getNextRaceOdds = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	return getNextRaceOddsDb(pb);
});
