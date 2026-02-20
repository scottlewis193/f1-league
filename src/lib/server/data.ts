import { sendNotifications } from '$lib/notifications';
import PocketBase from 'pocketbase';
import { scrapeAll } from '$lib/scrapping';
import type {
	Driver,
	OddsRecord,
	Player,
	Prediction,
	Race,
	Team,
	Wallet,
	WiseTransfer
} from '$lib/types';
import { getPlayerStats, oddsToPoints } from '$lib/utils';
import _pb from './pocketbase';
import { wiseFetch } from './wise';
import { WISE_ACCOUNT_ID } from '$env/static/private';

const ONE_HOUR = 60 * 60 * 1000;

export async function refreshF1DataHourly() {
	//scrape all data and update db every hour

	//get current data so we can compare to see if anything has changed
	const { currentDrivers, currentTeams, currentRaces } = await getCurrentDataDb();

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

	//if race results have come in, we will notify users/players and pay out the winnings
	if (currentRaceResults.length !== newRaceResults.length) {
		console.log('notifications sent');

		sendNotifications({
			title: 'New Race Results',
			body: 'Check out the latest race results.',
			icon: 'https://f1-league.hades.ws/logo.png',
			badge: 'https://f1-league.hades.ws/logo.png',
			data: {
				url: 'https://f1-league.hades.ws/players'
			},
			tag: 'message-notification'
		});

		const players = await getPlayersDb();
		players.forEach((player) => {
			player.displayLatestResultsDialog = true;
		});
		await updateAllPlayersDb(players);
	}

	await updateDriversDb(drivers);
	await updateTeamsDb(teams);
	await updateRacesDb(races);
	if (await isOddsUpdateWindowOpen()) {
		await updateOddsDb(odds, currentDrivers);
	}
	console.log('F1 data refreshed', new Date());

	// Schedule the next run
	setTimeout(refreshF1DataHourly, ONE_HOUR);
}

export async function checkForNewDeposits() {
	const data: WiseTransfer[] = await wiseFetch('transfers?status=COMPLETED', 'v1', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	});

	const deposits = data.filter((transfer) => transfer.targetAccount === Number(WISE_ACCOUNT_ID));

	//get all wallet ids and then filter data so we only have transfers where the reference equals one of the wallet ids
	const walletIds = (await getAllWalletsDb()).map((wallet) => wallet.id);
	const filteredDeposits = deposits.filter((transfer) => walletIds.includes(transfer.reference));

	for (const deposit of filteredDeposits) {
		//check if deposit has log already, if not add it and update wallet balance
		const transferLog = await getTransferLogByIdDb(String(deposit.id));
		if (transferLog) continue;

		const wallet = await getWalletByIdDb(deposit.reference);
		if (!wallet) continue;

		await createTransferLog(
			String(deposit.id),
			wallet.user,
			wallet.id,
			deposit.targetValue,
			'deposit'
		);
		await updateWalletBalance(deposit.reference, wallet.balance + deposit.targetValue);
	}

	// Schedule the next run
	setTimeout(checkForNewDeposits, 10000);
}

export async function getPlayersDb(pbInstance: PocketBase | undefined = undefined) {
	const pb = pbInstance || _pb;
	const players: Player[] = await pb.collection('users').getFullList();
	return players;
}

export async function getPlayersWithStatsDb(pbInstance: PocketBase | undefined = undefined) {
	const pb = pbInstance || _pb;
	const players: Partial<Player>[] = await pb.collection('users').getFullList();
	const playersWithStats: Player[] = [];

	const submissions = await getPredictionsDb();
	const races = await getRacesDb();
	const odds = await getOddsDb();

	players.forEach((player) => {
		const id = player.id || '';
		const name = player.name || '';
		playersWithStats.push({
			id,
			name,
			email: player.email || '',
			avatar: player.avatar || '',
			displayLatestResultsDialog: player.displayLatestResultsDialog || false,
			walletAddress: player.walletAddress || '',
			...getPlayerStats(id, submissions, races, odds),
			userPointsBalance: player.userPointsBalance || 0,
			userPointsEarned: player.userPointsEarned || 0,
			wiseRecipientId: player.wiseRecipientId || 0
		});
	});

	playersWithStats.sort((a, b) => b.points - a.points);

	return playersWithStats;
}

export async function getPlayerWithStatsDb(
	playerId: string,
	pbInstance: PocketBase | undefined = undefined
): Promise<Player | null> {
	const pb = pbInstance || _pb;
	const player: Player = await pb.collection('users').getOne(playerId);

	if (!player) return null;

	const submissions = await getPredictionsDb();
	const races = await getRacesDb();
	const odds = await getOddsDb();

	const playerWithStats = {
		id: player.id,
		name: player.name,
		email: player.email,
		avatar: player.avatar,
		displayLatestResultsDialog: player.displayLatestResultsDialog || false,
		walletAddress: player.walletAddress || '',
		...getPlayerStats(player.id, submissions, races, odds),
		userPointsBalance: player.userPointsBalance || 0,
		userPointsEarned: player.userPointsEarned || 0,
		wiseRecipientId: player.wiseRecipientId || 0
	};

	return playerWithStats;
}

export async function getPlayerDb(
	playerId: string,
	pbInstance: PocketBase | undefined = undefined
) {
	const pb = pbInstance || _pb;
	const player: Player = await pb.collection('users').getOne(playerId);
	return player;
}

export async function updateAllPlayersDb(
	players: Player[],
	pbInstance: PocketBase | undefined = undefined
) {
	const pb = pbInstance || _pb;
	players.forEach(async (player) => {
		await pb.collection('users').update(player.id, player);
	});
}

export async function updatePlayerDb(
	playerId: string,
	player: Partial<Player>,
	pbInstance: PocketBase | undefined = undefined
) {
	const pb = pbInstance || _pb;
	await pb.collection('users').update(playerId, player);
}

export async function getCurrentDataDb(pbInstance: PocketBase | undefined = undefined) {
	const pb = pbInstance || _pb;
	const drivers: Driver[] = await pb
		.collection('drivers')
		.getFullList({ sort: '-points', filter: `year='${new Date().getFullYear()}'` });
	const teams: Team[] = await pb
		.collection('teams')
		.getFullList({ sort: '-points', filter: `year='${new Date().getFullYear()}'` });
	const races: Race[] = await pb
		.collection('races')
		.getFullList({ filter: `year='${new Date().getFullYear()}'` });
	return { currentDrivers: drivers, currentTeams: teams, currentRaces: races };
}

export async function isOddsUpdateWindowOpen() {
	const nextRace = await getNextRaceDb();
	const firstSession = nextRace.sessions[0];
	const year = nextRace.year;
	const now = new Date();

	const raceWeekendStartDate = new Date(
		Date.parse(firstSession.date + ' ' + year + ' ' + firstSession.time)
	);

	return now < raceWeekendStartDate;
}

export async function getRacesDb(pbInstance: PocketBase | undefined = undefined) {
	const pb = pbInstance || _pb;
	const races: Race[] = await pb
		.collection('races')
		.getFullList({ filter: `year='${new Date().getFullYear()}'` });
	return races;
}

export async function getNextRaceDb(pbInstance: PocketBase | undefined = undefined) {
	const pb = pbInstance || _pb;
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

export async function updateRacesDb(
	races: Partial<Race>[],
	pbInstance: PocketBase | undefined = undefined
) {
	const pb = pbInstance || _pb;
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

export async function updateDriversDb(
	drivers: Partial<Driver>[],
	pbInstance: PocketBase | undefined = undefined
) {
	const pb = pbInstance || _pb;
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

export async function getTeamsDb(pbInstance: PocketBase | undefined = undefined) {
	const pb = pbInstance || _pb;
	const teams: Team[] = await pb
		.collection('teams')
		.getFullList({ sort: '-points', filter: `year='${new Date().getFullYear()}'` });
	return teams;
}

export async function updateTeamsDb(
	teams: Partial<Team>[],
	pbInstance: PocketBase | undefined = undefined
) {
	const pb = pbInstance || _pb;
	const currentTeams = await pb.collection('teams').getFullList({ sort: '-points' });

	for (const team of teams) {
		if (!team) return;
		const currentTeam = currentTeams.find((d) => d.name === team.name && d.year === team.year);

		if (currentTeam) {
			await pb.collection('teams').update(currentTeam.id, {
				name: team.name,
				position: team.position,
				points: team.points,
				year: team.year
			});
		} else {
			await pb.collection('teams').create({
				name: team.name,
				position: team.position,
				points: team.points,
				year: team.year
			});
		}
	}
}

export async function getOddsDb(pbInstance: PocketBase | undefined = undefined) {
	const pb = pbInstance || _pb;
	const odds: OddsRecord[] = await pb.collection('odds').getFullList({ expand: 'driver,race' });
	return odds;
}

export async function getNextRaceOddsDb(pbInstance: PocketBase | undefined = undefined) {
	const pb = pbInstance || _pb;

	const race = (await getNextRaceDb()).id;

	const odds: OddsRecord[] = await pb.collection('odds').getFullList({
		expand: 'driver,race',
		filter: `race='${race}'`
	});

	return odds;
}

export async function updateOddsDb(
	odds: { driverName: string; odds: number }[],
	drivers: Partial<Driver>[],
	pbInstance: PocketBase | undefined = undefined
) {
	const pb = pbInstance || _pb;
	const currentOdds = await _pb.collection('odds').getFullList();
	const currentRace = await getNextRaceDb();

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

export async function getFeatureFlagStatus(
	pbInstance: PocketBase | undefined = undefined,
	name: string
) {
	const pb = pbInstance || _pb;
	const result = await pb.collection('feature_flags').getFirstListItem(`name="${name}"`);
	return result.enabled;
}

export async function getPredictionsDb(pbInstance: PocketBase | undefined = undefined) {
	const pb = pbInstance || _pb;
	const predictions: Prediction[] = await pb
		.collection('predictions')
		.getFullList({ expand: 'user,race' });
	return predictions;
}

export async function getNextRacePredictionsDb(pbInstance: PocketBase | undefined = undefined) {
	const pb = pbInstance || _pb;
	const race = (await getNextRaceDb()).id;
	const predictions: Prediction[] = await pb
		.collection('predictions')
		.getFullList({ expand: 'user,race', filter: `race='${race}'` });
	return predictions;
}

export async function getUserPredictionsDb(
	userId: string,
	pbInstance: PocketBase | undefined = undefined
) {
	const pb = pbInstance || _pb;
	const predictions: Prediction[] = await pb
		.collection('predictions')
		.getFullList({ expand: 'user,race', filter: `user='${userId}'` });
	return predictions;
}

export async function getDriversDb(pbInstance: PocketBase | undefined = undefined) {
	const pb = pbInstance || _pb;
	const drivers: Driver[] = await pb
		.collection('drivers')
		.getFullList({ sort: '-points', filter: `year='${new Date().getFullYear()}'` });
	return drivers;
}

export async function getWalletByIdDb(
	walletId: string,
	pbInstance: PocketBase | undefined = undefined
) {
	const pb = pbInstance || _pb;
	const wallet: Wallet = await pb.collection('wallets').getFirstListItem(`id='${walletId}'`);
	return wallet;
}

export async function getWalletByUserIdDb(
	userId: string,
	pbInstance: PocketBase | undefined = undefined
) {
	const pb = pbInstance || _pb;
	const wallet: Wallet = await pb.collection('wallets').getFirstListItem(`user='${userId}'`);
	return wallet;
}

export async function getAllWalletsDb(pbInstance: PocketBase | undefined = undefined) {
	const pb = pbInstance || _pb;
	const wallets: Wallet[] = await pb.collection('wallets').getFullList();
	return wallets;
}

export async function updateWalletBalance(
	walletId: string,
	newBalance: number,
	pbInstance: PocketBase | undefined = undefined
) {
	const pb = pbInstance || _pb;
	await pb.collection('wallets').update(walletId, { balance: newBalance });
}

export async function getTransferLogByIdDb(
	id: string,
	pbInstance: PocketBase | undefined = undefined
) {
	const pb = pbInstance || _pb;
	try {
		const transferLog = await pb.collection('transfer_logs').getFirstListItem(`id='${id}'`);
		return transferLog;
	} catch {
		return null;
	}
}

export async function createTransferLog(
	id: string = '',
	userId: string,
	walletId: string,
	amount: number,
	type: 'deposit' | 'withdraw' | 'transfer',
	targetWalletId: string = '',
	pbInstance: PocketBase | undefined = undefined
) {
	const pb = pbInstance || _pb;
	await pb.collection('transfer_logs').create({
		id: id,
		user: userId,
		wallet: walletId,
		amount,
		target_wallet: targetWalletId,
		type
	});
}
