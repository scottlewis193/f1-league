import type { Race } from '$lib/types';
import pb from './pocketbase';

export async function getRacesQuery() {
	const races: Race[] = await pb
		.collection('races')
		.getFullList({ filter: `year='${new Date().getFullYear()}'` });
	return races;
}

export async function getNextRaceQuery() {
	const currentDate = Date.now();
	let races: Race[] = await pb
		.collection('races')
		.getFullList({ filter: `year='${new Date().getFullYear()}'` });
	races = races.sort(
		(a, b) =>
			Date.parse(
				a.sessions[a.sessions.length - 1].date +
					' ' +
					new Date().getFullYear() +
					' ' +
					a.sessions[a.sessions.length - 1].time
			) -
			Date.parse(
				b.sessions[a.sessions.length - 1].date +
					' ' +
					new Date().getFullYear() +
					' ' +
					b.sessions[b.sessions.length - 1].time
			)
	);

	for (const race of races) {
		const fullRaceDate = Date.parse(
			race.sessions[race.sessions.length - 1].date +
				' ' +
				new Date(currentDate).getFullYear() +
				' ' +
				race.sessions[race.sessions.length - 1].time
		);

		if (fullRaceDate > currentDate) {
			return race;
		}
	}
	return races[0];
}

export async function updateRacesQuery(races: Partial<Race>[]) {
	const currentRaces = await pb.collection('races').getFullList({ sort: '-raceNo' });

	let raceNo = 1;
	for (const race of races) {
		if (!race) return;
		const currentRace = currentRaces.find((d) => d.raceName === race.raceName);

		if (currentRace) {
			await pb.collection('races').update(currentRace.id, {
				raceNo: raceNo,
				raceName: race.raceName,
				location: race.location,
				city: race.city,
				sessions: race.sessions,
				raceResults: race.raceResults,
				year: race.year
			});
		} else {
			await pb.collection('races').create({
				raceNo: raceNo,
				raceName: race.raceName,
				location: race.location,
				city: race.city,
				sessions: race.sessions,
				raceResults: race.raceResults,
				year: race.year
			});
		}
		raceNo++;
	}
}

async function getLastRaceWithResultsQuery() {
	const currentYear = new Date().getFullYear();
	const races = await pb
		.collection('races')
		.getFullList({ filter: `year = ${currentYear} && raceResults != '[]'`, sort: '-raceNo' });
	if (!races.length) {
		throw new Error('No races found');
	}
	const lastRace = races[0];
	if (!lastRace.results) {
		throw new Error('No results found for last race');
	}
	return lastRace;
}
