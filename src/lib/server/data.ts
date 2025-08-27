import { scrapeAll } from '$lib/scrapping';
import type { Driver, Race, Team } from '$lib/types';
import pb from './pocketbase';

const ONE_HOUR = 60 * 60 * 1000;

export async function refreshF1DataHourly() {
	//scrape all data and update db every hour
	console.log('Refreshing F1 data...', new Date());
	const { drivers, teams, races, error } = await scrapeAll();

	if (!drivers || !teams || !races) {
		console.log('F1 data failed to refresh', error, new Date());
		return;
	}

	await updateDrivers(drivers);
	await updateTeams(teams);
	await updateRaces(races);
	console.log('F1 data refreshed', new Date());

	// Schedule the next run
	setTimeout(refreshF1DataHourly, ONE_HOUR);
}

async function updateDrivers(drivers: Partial<Driver>[]) {
	const currentDrivers = await pb.collection('drivers').getFullList({ sort: '-points' });

	for (const driver of drivers) {
		if (!driver) return;
		const currentDriver = currentDrivers.find((d) => d.name === driver.name);

		if (currentDriver) {
			await pb.collection('drivers').update(currentDriver.id, {
				name: driver.name,
				position: driver.position,
				nationality: driver.nationality,
				team: driver.team,
				points: driver.points
			});
		} else {
			await pb.collection('drivers').create({
				name: driver.name,
				position: driver.position,
				nationality: driver.nationality,
				team: driver.team,
				points: driver.points
			});
		}
	}
}

async function updateTeams(teams: Partial<Team>[]) {
	const currentTeams = await pb.collection('teams').getFullList({ sort: '-points' });

	for (const team of teams) {
		if (!team) return;
		const currentTeam = currentTeams.find((d) => d.name === team.name);

		if (currentTeam) {
			await pb.collection('teams').update(currentTeam.id, {
				name: team.name,
				position: team.position,
				points: team.points
			});
		} else {
			await pb.collection('teams').create({
				name: team.name,
				position: team.position,
				points: team.points
			});
		}
	}
}

async function updateRaces(races: Partial<Race>[]) {
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
				sessions: race.sessions,
				raceResults: race.raceResults,
				year: race.year
			});
		} else {
			await pb.collection('races').create({
				raceNo: raceNo,
				raceName: race.raceName,
				location: race.location,
				sessions: race.sessions,
				raceResults: race.raceResults,
				year: race.year
			});
		}
		raceNo++;
	}
}
