import { getCurrentPlayerWithStats } from '$lib/remote/players.remote';
import type { Player } from '$lib/types';

export const load = async ({ locals, url }) => {
	const player = await getCurrentPlayerWithStats();
	return { user: player as unknown as Player, url: url.pathname };
};
