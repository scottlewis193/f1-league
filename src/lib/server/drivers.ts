import type { Driver } from '$lib/types';
import pb from './pocketbase';

export async function getDriversQuery() {
	const drivers: Driver[] = await pb
		.collection('drivers')
		.getFullList({ sort: '-points', filter: `year='${new Date().getFullYear()}'` });
	return drivers;
}

export async function updateDriversQuery(drivers: Partial<Driver>[]) {
	const currentDrivers = await pb.collection('drivers').getFullList({ sort: '-points' });

	for (const driver of drivers) {
		if (!driver) return;
		const currentDriver = currentDrivers.find(
			(d) => d.name === driver.name && d.year === driver.year
		);

		if (currentDriver) {
			await pb.collection('drivers').update(currentDriver.id, {
				name: driver.name,
				position: driver.position,
				nationality: driver.nationality,
				team: driver.team,
				points: driver.points,
				year: driver.year
			});
		} else {
			await pb.collection('drivers').create({
				name: driver.name,
				position: driver.position,
				nationality: driver.nationality,
				team: driver.team,
				points: driver.points,
				year: driver.year
			});
		}
	}
}
