import { getRequestEvent, query } from '$app/server';
import { scrapeF1Races } from '$lib/scrapping';
import type { Race } from '$lib/types';

let lastFetch = 0;
const ONE_HOUR = 60 * 60 * 1000;

export const getF1Schedule = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;

	let races: Race[] = await pb.collection('races').getFullList();

	return races;
});

export const getNextRace = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	let races: Race[] = await pb.collection('races').getFullList();
	const currentDate = Date.now();
	races = races.sort(
		(a, b) =>
			Date.parse(a.sessions[a.sessions.length - 1].date) -
			Date.parse(b.sessions[b.sessions.length - 1].date)
	);

	for (const race of races) {
		const fullRaceDate = Date.parse(
			race.sessions[race.sessions.length - 1].date + ' ' + new Date(currentDate).getFullYear()
		);

		if (fullRaceDate > currentDate) {
			return race;
		}
	}
	return races[0];
});

export const getRaces = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	const races: Race[] = await pb.collection('races').getFullList();
	return races;
});
