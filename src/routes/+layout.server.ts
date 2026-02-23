import { getCurrentPlayerWithStats } from '$lib/remote/players.remote';
import { getPlayersWithStatsQuery } from '$lib/server/players';
import type { Player } from '$lib/types';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url }) => {
	const players = await getPlayersWithStatsQuery();
	const currentUser = await getCurrentPlayerWithStats();
	return {
		users: players as unknown as Player[],
		url: url.pathname,
		currentUser: currentUser as Player
	};
};
