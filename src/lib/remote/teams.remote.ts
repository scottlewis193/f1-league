import { getRequestEvent, query } from '$app/server';
import { scrapeTeams } from '$lib/scrapping';
import type { Team } from '$lib/types';

let lastFetch = 0;
const ONE_HOUR = 60 * 60 * 1000;

export const getTeams = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;

	let teams: Team[] = await pb.collection('teams').getFullList({ sort: '-points' });

	return teams;
});
