import type { Race } from '$lib/types';
import { getAdminPb } from './pocketbase';
import { parseLondon } from '$lib/utils';

function getRaceSession(race: Race) {
	return (
		race.sessions.find((session) => session.title?.trim().toLowerCase() === 'race') ??
		race.sessions.at(-1)
	);
}

function getRaceTime(race: Race) {
	const session = getRaceSession(race);
	return session ? parseLondon(session.date, session.time, race.year) : Number.NaN;
}

export async function getRacesQuery() {
	const pb = await getAdminPb();
	const races: Race[] = await pb
		.collection('races')
		.getFullList({ filter: `year='${new Date().getFullYear()}'` });
	return races;
}

export async function getNextRaceQuery() {
	const pb = await getAdminPb();
	const currentDate = Date.now();
	let races: Race[] = await pb
		.collection('races')
		.getFullList({ filter: `year='${new Date().getFullYear()}'` });
	races = races.sort((a, b) => getRaceTime(a) - getRaceTime(b));

	for (const race of races) {
		const fullRaceDate = getRaceTime(race);

		if (fullRaceDate > currentDate) {
			return race;
		}
	}
	return races[0];
}

export async function updateRacesQuery(races: Partial<Race>[]) {
	const pb = await getAdminPb();
	const currentYear = new Date().getFullYear();
	const currentRaces = await pb.collection('races').getFullList({
		sort: '-raceNo',
		filter: pb.filter('year = {:year}', { year: currentYear })
	});

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

export async function updateRaceQuery(race: Partial<Race>) {
	const pb = await getAdminPb();
	if (!race.id) return;
	await pb.collection('races').update(race.id, race);
}

export async function getLastRaceWithResultsQuery() {
	const pb = await getAdminPb();
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
