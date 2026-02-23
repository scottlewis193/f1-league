import { query } from '$app/server';
import { getNextRaceOddsQuery, getOddsQuery } from '$lib/server/odds';

export const getOdds = query(async () => {
	return getOddsQuery();
});

export const getNextRaceOdds = query(async () => {
	return getNextRaceOddsQuery();
});
