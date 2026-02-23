import type { Driver, OddsRecord } from '$lib/types';
import { oddsToPoints } from '$lib/utils';
import pb from './pocketbase';
import { getNextRaceQuery } from './races';

export async function getOddsQuery() {
	const odds: OddsRecord[] = await pb.collection('odds').getFullList({ expand: 'driver,race' });
	return odds;
}

export async function getNextRaceOddsQuery() {
	const race = (await getNextRaceQuery()).id;

	const odds: OddsRecord[] = await pb.collection('odds').getFullList({
		expand: 'driver,race',
		filter: `race='${race}'`
	});

	return odds;
}

export async function updateOddsQuery(
	odds: { driverName: string; odds: number }[],
	drivers: Partial<Driver>[]
) {
	const currentOdds = await pb.collection('odds').getFullList();
	const currentRace = await getNextRaceQuery();

	//here we adding the driver and race ids before insert the object into the db
	const oddsRecords: Partial<OddsRecord>[] = [];
	for (const odd of odds) {
		const driverLastName = odd.driverName?.split(' ')[1];

		const oddsRecord: Partial<OddsRecord> = {
			driver: drivers.find((d) => d.name == driverLastName)?.id || '',
			race: currentRace.id,
			odds: odd.odds || 0,
			pointsForPlace: oddsToPoints(odd.odds || 1),
			pointsForExact: oddsToPoints(odd.odds || 1) * 3
		};

		oddsRecords.push(oddsRecord);
	}

	//here we update or create a record on the db depending on if it already exists
	for (const oddsRecord of oddsRecords) {
		if (!oddsRecord) return;
		const currentOdd = currentOdds.find(
			(d) => d.driver === oddsRecord.driver && d.race === oddsRecord.race
		);

		if (currentOdd) {
			await pb.collection('odds').update(currentOdd.id, {
				driver: oddsRecord.driver,
				race: oddsRecord.race,
				odds: oddsRecord.odds,
				pointsForPlace: oddsRecord.pointsForPlace,
				pointsForExact: oddsRecord.pointsForExact
			});
		} else {
			await pb.collection('odds').create({
				driver: oddsRecord.driver,
				race: oddsRecord.race,
				odds: oddsRecord.odds,
				pointsForPlace: oddsRecord.pointsForPlace,
				pointsForExact: oddsRecord.pointsForExact
			});
		}
	}
}
