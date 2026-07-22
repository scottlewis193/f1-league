import type { Driver } from '$lib/types';
import { getAdminPb } from './pocketbase';
import { normalizeDriverName } from './scraping';

export async function getDriversQuery() {
	const pb = await getAdminPb();
	const drivers: Driver[] = await pb
		.collection('drivers')
		.getFullList({ sort: '-points,position', filter: `year='${new Date().getFullYear()}'` });
	return drivers;
}

export async function updateDriversQuery(drivers: Partial<Driver>[]) {
	const pb = await getAdminPb();
	const currentYear = new Date().getFullYear();
	const currentDrivers = await pb.collection('drivers').getFullList({
		sort: '-points',
		filter: pb.filter('year = {:year}', { year: currentYear })
	});

	for (const driver of drivers) {
		if (!driver) return;
		const normalizedName = normalizeDriverName(driver.name ?? '');
		const currentDriver = currentDrivers.find(
			(d) =>
				d.year === driver.year &&
				(normalizeDriverName(d.name) === normalizedName ||
					(normalizedName.split(' ').at(-1) === normalizeDriverName(d.name).split(' ').at(-1) &&
						d.team === driver.team))
		);

		if (currentDriver) {
			await pb.collection('drivers').update(currentDriver.id, {
				name: normalizedName,
				position: driver.position,
				nationality: driver.nationality,
				team: driver.team,
				points: driver.points,
				year: driver.year
			});
		} else {
			await pb.collection('drivers').create({
				name: normalizedName,
				position: driver.position,
				nationality: driver.nationality,
				team: driver.team,
				points: driver.points,
				year: driver.year
			});
		}
	}
}
