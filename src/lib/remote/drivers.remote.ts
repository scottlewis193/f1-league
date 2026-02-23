import { query } from '$app/server';
import { getDriversQuery } from '$lib/server/drivers';

export const getDrivers = query(async () => {
	return getDriversQuery();
});
