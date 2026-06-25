import { query } from '$app/server';
import { getTeamsQuery } from '$lib/server/teams';

export const getTeams = query(async () => {
	return await getTeamsQuery();
});
