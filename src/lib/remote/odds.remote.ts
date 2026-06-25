import { query } from '$app/server';
import { getNextRaceOddsQuery } from '$lib/server/odds';

export const getNextRaceOdds = query(async () => {
	return getNextRaceOddsQuery();
});
