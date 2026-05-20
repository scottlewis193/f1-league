import { env } from '$env/dynamic/private';
import type { Player, Wallet, Race } from '$lib/types';
import pb, { getServerPb } from './pocketbase';
import { updateRaceQuery } from './races';
import { createTransferLog } from './transfers';

export async function getWalletByIdQuery(walletId: string) {
	const pb = await getServerPb();
	const wallet: Wallet = await pb.collection('wallets').getFirstListItem(`id='${walletId}'`);
	return wallet;
}

export async function getWalletByUserIdQuery(userId: string) {
	const pb = await getServerPb();
	const wallet: Wallet = await pb.collection('wallets').getFirstListItem(`user='${userId}'`);
	return wallet;
}

export async function getAllWalletsQuery() {
	const pb = await getServerPb();
	const wallets: Wallet[] = await pb.collection('wallets').getFullList();
	return wallets;
}

export async function updateWalletBalance(walletId: string, newBalance: number) {
	const pb = await getServerPb();
	await pb.collection('wallets').update(walletId, { balance: newBalance });
}

export async function payOutWinnings(players: Player[], race: Race) {
	//if race is already paid out, return early
	if (race.paidOut) return;

	//this assumes lastPointsEarned has been updated

	//determine winning amount
	let winningPointsAmount = 0;
	for (const player of players) {
		if (player.lastPointsEarned > winningPointsAmount) {
			winningPointsAmount = player.lastPointsEarned;
		}
	}

	//determine winners
	const winners = players.filter((player) => player.lastPointsEarned == winningPointsAmount);

	//determine payout amount per winner
	const playerPayoutAmount =
		Number((Number(env.PREDICTION_ENTRY_FEE) * players.length).toFixed(2)) / winners.length;

	//transfer winnings to winners
	for (const winner of winners) {
		const winnerWallet = await getWalletByUserIdQuery(winner.id);
		await transferFromPredictionWallet(playerPayoutAmount, winnerWallet.id);
	}

	//mark race as paid out
	race.paidOut = true;
	await updateRaceQuery(race);
	console.log('Payout complete for race', race.id);
}

async function transferFromPredictionWallet(amount: number, targetWalletId: string) {
	try {
		const pb = await getServerPb();
		const targetWallet = await getWalletByIdQuery(targetWalletId);
		const predictionWallet = await getWalletByIdQuery(env.PREDICTION_WALLET_ID!);

		//remove from prediction wallet
		await pb
			.collection('wallets')
			.update(env.PREDICTION_WALLET_ID!, { balance: predictionWallet.balance - amount });

		//add to target wallet
		await pb
			.collection('wallets')
			.update(targetWalletId, { balance: targetWallet.balance + amount });

		//log transfer
		await createTransferLog(
			'',
			targetWallet.user,
			env.PREDICTION_WALLET_ID!,
			Number(env.PREDICTION_ENTRY_FEE),
			'transfer',
			targetWallet.id
		);
		return true;
	} catch (error) {
		return false;
	}
}
