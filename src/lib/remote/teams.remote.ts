import { command, getRequestEvent, query } from '$app/server';
import type { Team } from '$lib/types';
import _pb from '$lib/server/pocketbase';
import { getTeamsDb, updateTeamsDb } from '$lib/server/data';

export const getTeams = query(async () => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	return await getTeamsDb(pb);
});

export const updateTeams = command('unchecked', async (teams: Partial<Team>[]) => {
	const event = getRequestEvent();
	const pb = event.locals.pb;
	await updateTeamsDb(teams, pb);
});
