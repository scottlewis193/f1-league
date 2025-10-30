import { getRequestEvent, query } from '$app/server';
import { getNextRaceDb, getRacesDb } from '$lib/server/data';
import type { Race } from '$lib/types';

const lastFetch = 0;
const ONE_HOUR = 60 * 60 * 1000;

export const getF1Schedule = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;

	const races: Race[] = await pb.collection('races').getFullList();

	return races;
});

export const getNextRace = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	return getNextRaceDb(pb);
});

export const getRaces = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	return getRacesDb(pb);
});
