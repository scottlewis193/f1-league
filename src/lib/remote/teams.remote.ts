import { command, query } from '$app/server';
import { getTeamsQuery, updateTeamsQuery } from '$lib/server/teams';
import type { Team } from '$lib/types';

export const getTeams = query(async () => {
	return await getTeamsQuery();
});

export const updateTeams = command('unchecked', async (teams: Partial<Team>[]) => {
	await updateTeamsQuery(teams);
});
