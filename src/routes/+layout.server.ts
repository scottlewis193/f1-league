import { getCurrentPlayerWithStats } from '$lib/remote/players.remote';
import { getPlayersWithStatsDb } from '$lib/server/data.js';
import type { Player } from '$lib/types';

export const load = async ({ url }) => {
	const players = await getPlayersWithStatsDb();
	const currentUser = await getCurrentPlayerWithStats();
	return {
		users: players as unknown as Player[],
		url: url.pathname,
		currentUser: currentUser as Player
	};
};
