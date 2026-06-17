import { getCurrentPlayerWithStats } from '$lib/remote/players.remote';
import { getPlayersWithStatsQuery } from '$lib/server/players';
import type { Player } from '$lib/types';
import type { LayoutServerLoad } from './$types';
import { env as publicEnv } from '$env/dynamic/public';

export const load: LayoutServerLoad = async ({ url }) => {
	const currentUser = (await getCurrentPlayerWithStats()) as Player | null;
	const users = currentUser?.displayLatestResultsDialog
		? ((await getPlayersWithStatsQuery()) as unknown as Player[])
		: [];

	return {
		users,
		url: url.pathname,
		currentUser,
		pbUrl: publicEnv.PUBLIC_PB_URL
	};
};
