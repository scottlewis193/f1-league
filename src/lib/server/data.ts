import { sendNotifications } from '$lib/notifications';
import PocketBase from 'pocketbase';
import { scrapeAll } from '$lib/server/scrapping';
import type { Driver, Race, WiseTransfer } from '$lib/types';
import { getPlayerStats } from '$lib/utils';
import { getAdminPb } from './pocketbase';
import { wiseFetch } from './wise';
import { env } from '$env/dynamic/private';
import {
	getAllWalletsQuery,
	getWalletByIdQuery,
	payOutWinnings,
	updateWalletBalance
} from './wallets';
import { getNextRaceQuery, updateRacesQuery } from './races';
import { createTransferLog, getTransferLogByIdQuery } from './transfers';
import { getOddsQuery, updateOddsQuery } from './odds';
import { updateTeamsQuery } from './teams';
import { updateDriversQuery } from './drivers';
import { getPlayersQuery, updateAllPlayersQuery } from './players';
import { getPredictionsQuery } from './predictions';

const ONE_HOUR = 60 * 60 * 1000;

export async function refreshF1DataOnce() {
	//scrape all data and update db every hour

	//get current data so we can compare to see if anything has changed
	const { currentDrivers, currentRaces } = await getCurrentDataDb();

	console.log('Refreshing F1 data...', new Date());
	const { drivers, teams, races, odds, error } = await scrapeAll();

	if (error) {
		console.error('F1 data scrape failed:', error, new Date());
		return;
	}

	if (!races || !drivers || !teams || !odds) {
		console.error('F1 data is missing fields', new Date());
		return;
	}

	//testing
	// races.push({
	// 	raceName: 'FORMULA 1 QATAR AIRWAYS AUSTRALIAN GRAND PRIX 2026',
	// 	city: 'Melbourne',
	// 	location: 'australia',
	// 	raceResults: ['Verstappen', 'Piastri', 'Norris', 'Leclerc', 'Russell'],
	// 	year: 2026,
	// 	raceNo: 1,
	// 	id: '',
	// 	sessions: []
	// });

	//assign existing race id based on race name
	for (const race of races) {
		const currentRaceNames = currentRaces.map((cr) => cr.raceName);
		if (currentRaceNames.includes(race.raceName)) {
			race.id = currentRaces.find((cr) => cr.raceName === race.raceName)?.id || '';
		}
	}

	//here we will check if race results have come in by comparing the current race data to the newly scrapped race data

	//filter out races with results — guard against null/undefined
	const currentRacesWithResults = currentRaces.filter(
		(r) => r.raceResults && r.raceResults.length > 0
	);
	const newRacesWithResults = races.filter((r) => r.raceResults && r.raceResults.length > 0);

	//if race results have come in, we will notify users/players and pay out the winnings
	if (currentRacesWithResults.length !== newRacesWithResults.length) {
		let latestRaceWithResults: Race | undefined = undefined;

		for (const race of newRacesWithResults) {
			const currentRaceNames = currentRacesWithResults.map((cr) => cr.raceName);
			if (!currentRaceNames.includes(race.raceName)) {
				latestRaceWithResults = race;
			}
		}

		if (!latestRaceWithResults) {
			console.warn('Race results changed but no new race with results found');
			return;
		}

		// Ensure the latest race has an ID before proceeding
		if (!latestRaceWithResults.id) {
			console.error(`Latest race with results has no ID: ${latestRaceWithResults.raceName}`);
			return;
		}

		console.log(`New race results detected: ${latestRaceWithResults.raceName}`, new Date());

		await sendNotifications({
			title: 'New Race Results',
			body: 'Check out the latest race results.',
			icon: 'https://f1-league.hades.ws/logo.png',
			badge: 'https://f1-league.hades.ws/logo.png',
			data: {
				url: 'https://f1-league.hades.ws/players'
			},
			tag: 'message-notification'
		});

		const players = await getPlayersQuery();
		const oddsRecords = await getOddsQuery();
		const submissions = await getPredictionsQuery();

		for (let i = 0; i < players.length; i++) {
			players[i] = {
				...players[i],
				...getPlayerStats(players[i].id, submissions, newRacesWithResults, oddsRecords)
			};
			players[i].displayLatestResultsDialog = true;
		}

		await updateAllPlayersQuery(players);

		//latest race predictions
		const latestRacePredictions = submissions.filter((s) => s.race == latestRaceWithResults?.id);

		//the players with prediction for that race
		const playersWithPredictions = players.filter((p) =>
			latestRacePredictions.map((p) => p.user).includes(p.id)
		);

		//pay out winnings
		await payOutWinnings(playersWithPredictions, latestRaceWithResults);
	}

	await updateDriversQuery(drivers);
	await updateTeamsQuery(teams);
	await updateRacesQuery(races);
	if (await isOddsUpdateWindowOpen()) {
		await updateOddsQuery(odds, currentDrivers);
	}
	console.log('F1 data refreshed', new Date());
}

export async function refreshF1DataHourly() {
	try {
		await refreshF1DataOnce();
	} catch (error) {
		console.error('F1 data refresh failed:', error);
	} finally {
		setTimeout(refreshF1DataHourly, ONE_HOUR);
	}
}

export async function checkForNewDepositsOnce() {
	if (!env.WISE_API_KEY || !env.WISE_API_BASE || !env.WISE_ACCOUNT_ID) {
		console.warn('Wise deposit polling skipped: Wise environment variables are not configured');
		return;
	}

	const today = new Date();
	const data: WiseTransfer[] = await wiseFetch(
		'transfers?status=COMPLETED&createdDateStart=' + today.toISOString().split('T')[0],
		'v1',
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);

	const deposits = data.filter(
		(transfer) => transfer.targetAccount === Number(env.WISE_ACCOUNT_ID)
	);

	//get all wallet ids and then filter data so we only have transfers where the reference equals one of the wallet ids
	const walletIds = (await getAllWalletsQuery()).map((wallet) => wallet.id);

	const filteredDeposits = deposits.filter((transfer) => walletIds.includes(transfer.reference));

	for (const deposit of filteredDeposits) {
		//check if deposit has log already, if not add it and update wallet balance
		const transferLog = await getTransferLogByIdQuery(String(deposit.id));
		if (transferLog) continue;

		const wallet = await getWalletByIdQuery(deposit.reference);
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
}

export async function checkForNewDeposits() {
	try {
		await checkForNewDepositsOnce();
	} catch (error) {
		console.error('Wise deposit polling failed:', error);
	} finally {
		// Schedule the next run
		setTimeout(checkForNewDeposits, 10000);
	}
}

export async function getCurrentDataDb(pbInstance: PocketBase | undefined = undefined) {
	const pb = pbInstance || (await getAdminPb());
	const drivers: Driver[] = await pb
		.collection('drivers')
		.getFullList({ sort: '-points', filter: `year='${new Date().getFullYear()}'` });
	const races: Race[] = await pb
		.collection('races')
		.getFullList({ filter: `year='${new Date().getFullYear()}'` });
	return { currentDrivers: drivers, currentRaces: races };
}

export async function isOddsUpdateWindowOpen() {
	const nextRace = await getNextRaceQuery();
	const firstSession = nextRace.sessions[0];
	const year = nextRace.year;
	const now = new Date();

	const raceWeekendStartDate = new Date(
		Date.parse(firstSession.date + ' ' + year + ' ' + firstSession.time)
	);

	return now < raceWeekendStartDate;
}

export async function getFeatureFlagStatus(
	pbInstance: PocketBase | undefined = undefined,
	name: string
) {
	const pb = pbInstance || (await getAdminPb());
	const result = await pb.collection('feature_flags').getFirstListItem(`name="${name}"`);
	return result.enabled;
}
