import { sendNotifications } from '$lib/notifications';
import { scrapeAll } from '$lib/scrapping';
import type { Driver, OddsRecord, Race, Team } from '$lib/types';
import { oddsToPoints } from '$lib/utils';
import pb from './pocketbase';

const ONE_HOUR = 60 * 60 * 1000;

export async function refreshF1DataHourly() {
	//scrape all data and update db every hour

	//get current data so we can compare to see if anything has changed
	const { currentDrivers, currentTeams, currentRaces } = await getCurrentData();

	console.log('Refreshing F1 data...', new Date());
	const { drivers, teams, races, odds, error } = await scrapeAll();

	if (error) {
		console.log('F1 data failed to refresh', error, new Date());
		return;
	}

	if (!races || !drivers || !teams || !odds) {
		console.log('F1 data failed to refresh', new Date());
		return;
	}

	//here we will check if race results have come in by comparing the current race data to the newly scrapped race data

	//filter out empty race results
	const currentRaceResults = currentRaces.map((r) => r.raceResults).filter((rr) => rr.length > 0);
	const newRaceResults = races.map((r) => r.raceResults).filter((rr) => rr.length > 0);

	//if race results have come in, we will notify users/players
	if (currentRaceResults.length != newRaceResults.length) {
		console.log('notifications sent');

		sendNotifications({
			title: 'New Race Results',
			body: 'Check out the latest race results.',
			icon: '/logo.png',
			badge: '/logo.png',
			data: {
				url: 'https://f1-league.hades.ws/players'
			},
			tag: 'message-notification'
		});
	}

	await updateDrivers(drivers);
	await updateTeams(teams);
	await updateRaces(races);
	if (await isOddsUpdateWindowOpen()) {
		await updateOdds(odds, currentDrivers);
	}
	console.log('F1 data refreshed', new Date());

	// Schedule the next run
	setTimeout(refreshF1DataHourly, ONE_HOUR);
}

async function getCurrentData() {
	const drivers: Driver[] = await pb.collection('drivers').getFullList({ sort: '-points' });
	const teams: Team[] = await pb.collection('teams').getFullList({ sort: '-points' });
	const races: Race[] = await pb.collection('races').getFullList();
	return { currentDrivers: drivers, currentTeams: teams, currentRaces: races };
}

export async function isOddsUpdateWindowOpen() {
	const nextRace = await getNextRace();
	const firstSession = nextRace.sessions[0];
	const year = nextRace.year;
	const now = new Date();

	const raceWeekendStartDate = new Date(
		Date.parse(firstSession.date + ' ' + year + ' ' + firstSession.time)
	);

	return now < raceWeekendStartDate;
}

async function getNextRace() {
	let races: Race[] = await pb.collection('races').getFullList();
	const currentDate = Date.now();
	races = races.sort(
		(a, b) =>
			Date.parse(
				a.sessions[a.sessions.length - 1].date +
					' ' +
					new Date(currentDate).getFullYear() +
					' ' +
					a.sessions[a.sessions.length - 1].time
			) -
			Date.parse(
				b.sessions[a.sessions.length - 1].date +
					' ' +
					new Date(currentDate).getFullYear() +
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

export async function updateOdds(
	odds: { driverName: string; odds: number }[],
	drivers: Partial<Driver>[]
) {
	const currentOdds = await pb.collection('odds').getFullList();
	const currentRace = await getNextRace();

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
