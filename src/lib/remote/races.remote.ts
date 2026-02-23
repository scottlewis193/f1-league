import { query } from '$app/server';
import { getNextRaceQuery, getRacesQuery } from '$lib/server/races';

export const getF1Schedule = query(async () => {
	return getRacesQuery();
});

export const getNextRace = query(async () => {
	return getNextRaceQuery();
});

export const getRaces = query(async () => {
	return getRacesQuery();
});
