import { env } from '$env/dynamic/private';
import type { Player, TransferLog, Wallet, Race } from '$lib/types';
import { getAdminPb } from './pocketbase';
import { updateRaceQuery } from './races';
import { createTransferLog } from './transfers';

export async function getWalletByIdQuery(walletId: string) {
	const pb = await getAdminPb();
	const wallet: Wallet = await pb.collection('wallets').getFirstListItem(`id='${walletId}'`);
	return wallet;
}

export async function getWalletByUserIdQuery(userId: string) {
	const pb = await getAdminPb();
	const wallet: Wallet = await pb.collection('wallets').getFirstListItem(`user='${userId}'`);
	return wallet;
}

export async function getAllWalletsQuery() {
	const pb = await getAdminPb();
	const wallets: Wallet[] = await pb.collection('wallets').getFullList();
	return wallets;
}

export async function getDonationTotalsQuery(): Promise<
	{
		id: string;
		name: string;
		totalDonated: number;
		owed: number;
	}[]
> {
	const pb = await getAdminPb();

	// Get all players with names
	const players: Player[] = await pb.collection('users').getFullList();
	const playerMap = new Map(players.map((p) => [p.id, p.name]));

	// Get wallets to map user -> wallet id
	const wallets: Wallet[] = await pb.collection('wallets').getFullList();
	const walletById = new Map(wallets.map((w) => [w.id, w.user]));

	// Sum donations per player (transfers into the season wallet)
	const logs: TransferLog[] = await pb.collection('transfer_logs').getFullList({
		filter: `type='transfer' && targetWallet='${env.SEASON_WALLET_ID}'`,
		expand: 'user'
	});

	const totals = new Map<string, number>();
	for (const log of logs) {
		// if (log.status !== 'complete') continue;
		totals.set(log.user, (totals.get(log.user) ?? 0) + log.amount);
	}

	// Count races with results this season
	const completedRaces: Race[] = await pb.collection('races').getFullList({
		filter: `year='${new Date().getFullYear()}' && raceResults != '[]'`
	});
	const RACE_DONATION_PER_RACE = 2;
	const racesCompleted = completedRaces.length;

	return players
		.map((p) => {
			const totalDonated = totals.get(p.id) ?? 0;
			const owed = racesCompleted * RACE_DONATION_PER_RACE - totalDonated;
			return { id: p.id, name: playerMap.get(p.id) || p.name, totalDonated, owed };
		})
		.filter((entry) => entry.totalDonated > 0)
		.sort((a, b) => b.totalDonated - a.totalDonated);
}

export async function updateWalletBalance(walletId: string, newBalance: number) {
	const pb = await getAdminPb();
	await pb.collection('wallets').update(walletId, { balance: newBalance });
}

function roundMoney(amount: number) {
	return Number(amount.toFixed(2));
}

export async function transferBetweenWallets({
	amount,
	sourceWalletId,
	targetWalletId,
	userId,
	allowOverdraft = false,
	status = 'complete'
}: {
	amount: number;
	sourceWalletId: string;
	targetWalletId: string;
	userId?: string;
	allowOverdraft?: boolean;
	status?: 'pending' | 'complete' | 'failed';
}) {
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new Error('Transfer amount must be greater than zero');
	}

	const pb = await getAdminPb();
	const sourceWallet = await getWalletByIdQuery(sourceWalletId);
	const targetWallet = await getWalletByIdQuery(targetWalletId);
	const transferAmount = roundMoney(amount);

	if (!allowOverdraft && sourceWallet.balance < transferAmount) {
		throw new Error('Insufficient wallet balance');
	}

	await pb.collection('wallets').update(sourceWallet.id, {
		balance: roundMoney(sourceWallet.balance - transferAmount)
	});

	try {
		await pb.collection('wallets').update(targetWallet.id, {
			balance: roundMoney(targetWallet.balance + transferAmount)
		});

		await createTransferLog(
			'',
			userId ?? sourceWallet.user,
			sourceWallet.id,
			transferAmount,
			'transfer',
			targetWallet.id,
			status
		);
	} catch (error) {
		// Best-effort rollback to avoid leaving balances inconsistent if the second update/log fails.
		await pb.collection('wallets').update(sourceWallet.id, { balance: sourceWallet.balance });
		throw error;
	}

	return true;
}

export async function payOutWinnings(players: Player[], race: Race) {
	//if race is already paid out, return early
	if (race.paidOut) {
		console.log('Race already paid out:', race.id);
		return;
	}

	if (!players.length) {
		console.log('No players to pay out for race:', race.id);
		return;
	}

	// this assumes lastPointsEarned has been updated

	// determine winning amount
	let winningPointsAmount = 0;
	for (const player of players) {
		if (player.lastPointsEarned > winningPointsAmount) {
			winningPointsAmount = player.lastPointsEarned;
		}
	}

	// determine winners
	const winners = players.filter((player) => player.lastPointsEarned == winningPointsAmount);

	// determine payout amount per winner — use actual number of predictors, not total players
	const playerPayoutAmount =
		Number((Number(env.PREDICTION_ENTRY_FEE) * players.length).toFixed(2)) / winners.length;

	// transfer winnings to winners
	for (const winner of winners) {
		const winnerWallet = await getWalletByUserIdQuery(winner.id);
		if (!winnerWallet) {
			console.error(`No wallet found for winner ${winner.id}`);
			continue;
		}
		await transferFromPredictionWallet(playerPayoutAmount, winnerWallet.id);
	}

	// mark race as paid out in the DB
	race.paidOut = true;
	await updateRaceQuery(race);
	console.log('Payout complete for race', race.id);
}

async function transferFromPredictionWallet(amount: number, targetWalletId: string) {
	try {
		const targetWallet = await getWalletByIdQuery(targetWalletId);
		return transferBetweenWallets({
			amount,
			sourceWalletId: env.PREDICTION_WALLET_ID!,
			targetWalletId,
			userId: targetWallet.user
		});
	} catch {
		return false;
	}
}
