import { sendNotifications } from '$lib/notifications';
import PocketBase from 'pocketbase';
import { scrapeAll } from '$lib/server/scrapping';
import type { Driver, Player, Race, WiseTransfer } from '$lib/types';
import { getPlayerStats } from '$lib/utils';
import { getAdminPb } from './pocketbase';
import { wiseFetch } from './wise';
import { env } from '$env/dynamic/private';
import {
	getAllWalletsQuery,
	getWalletByIdQuery,
	payOutWinnings,
	adjustWalletBalance
} from './wallets';
import { getNextRaceQuery, updateRacesQuery } from './races';
import { createTransferLog, getTransferLogByIdQuery } from './transfers';
import { getOddsQuery, updateOddsQuery } from './odds';
import { updateTeamsQuery } from './teams';
import { updateDriversQuery } from './drivers';
import { getPlayersQuery, updateAllPlayersQuery } from './players';
import { getPredictionsQuery } from './predictions';
import { walletActivityNotificationPayload } from '$lib/domain/wallets';

const ONE_HOUR = 60 * 60 * 1000;

export async function refreshF1DataOnce() {
	//scrape all data and update db every hour

	//get current data so we can compare to see if anything has changed
	const { currentDrivers, currentRaces } = await getCurrentDataDb();

	console.log('Refreshing F1 data...', new Date());
	const { drivers, teams, races, odds } = await scrapeAll();

	if (races) {
		//assign existing race id based on race name
		for (const race of races) {
			const currentRaceNames = currentRaces.map((cr) => cr.raceName);
			if (currentRaceNames.includes(race.raceName)) {
				race.id = currentRaces.find((cr) => cr.raceName === race.raceName)?.id || '';
			}
		}

		//check if race results have come in by comparing current vs newly scraped
		const currentRaceNamesWithResults = new Set(
			currentRaces.filter((r) => r.raceResults && r.raceResults.length > 0).map((r) => r.raceName)
		);
		const newRacesWithResults = races.filter((r) => r.raceResults && r.raceResults.length > 0);

		//races that gained results since the last scrape — every one of them must be paid out
		const newlyCompletedRaces = newRacesWithResults.filter(
			(r) => !currentRaceNamesWithResults.has(r.raceName)
		);

		if (newlyCompletedRaces.length > 0) {
			console.log(
				`New race results detected: ${newlyCompletedRaces.map((r) => r.raceName).join(', ')}`,
				new Date()
			);

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

			const oddsRecords = await getOddsQuery();
			const submissions = await getPredictionsQuery();

			//recompute player stats across the full set of resulted races so totals stay correct
			const players = await getPlayersQuery();
			for (let i = 0; i < players.length; i++) {
				players[i] = {
					...players[i],
					...getPlayerStats(players[i].id, submissions, newRacesWithResults, oddsRecords)
				};
				players[i].displayLatestResultsDialog = true;
			}
			await updateAllPlayersQuery(players);

			//pay out every newly-completed race, each against its own per-race points so the
			//winner is determined correctly regardless of how many races landed in one cycle
			for (const race of newlyCompletedRaces) {
				if (!race.id) {
					console.error(`Latest race with results has no ID: ${race.raceName}`);
					continue;
				}

				//recompute per-race stats for this single race so lastPointsEarned is race-scoped
				const racePredictions = submissions.filter((s) => s.race === race.id);
				const playersWithPredictions = racePredictions
					.map((pred) => {
						const player = players.find((p) => p.id === pred.user);
						if (!player) return undefined;
						const perRaceStats = getPlayerStats(
							player.id,
							[pred],
							newRacesWithResults.filter((r) => r.id === race.id),
							oddsRecords
						);
						return { ...player, lastPointsEarned: perRaceStats.lastPointsEarned };
					})
					.filter((p): p is Player => Boolean(p));

				await payOutWinnings(playersWithPredictions, race);
			}
		}

		await updateRacesQuery(races);
	}

	if (drivers) await updateDriversQuery(drivers);
	if (teams) await updateTeamsQuery(teams);
	if (odds && (await isOddsUpdateWindowOpen())) {
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
		const existingTransferLog = await getTransferLogByIdQuery(String(deposit.id));
		if (existingTransferLog) continue;

		const wallet = await getWalletByIdQuery(deposit.reference);
		if (!wallet) continue;

		const transferLog = await createTransferLog(
			String(deposit.id),
			wallet.user,
			wallet.id,
			deposit.targetValue,
			'deposit'
		);
		await adjustWalletBalance(deposit.reference, deposit.targetValue);

		const payload = walletActivityNotificationPayload(transferLog);
		if (payload) {
			sendNotifications(payload, wallet.user).catch((error) =>
				console.error('Deposit notification failed:', error)
			);
		}
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
	const result = await pb
		.collection('feature_flags')
		.getFirstListItem(pb.filter('name = {:name}', { name }));
	return result.enabled;
}
