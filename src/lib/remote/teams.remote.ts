import { getRequestEvent, query } from '$app/server';
import type { Team } from '$lib/types';

export const getTeams = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;

	let teams: Team[] = await pb.collection('teams').getFullList({ sort: '-points' });

	return teams;
});
