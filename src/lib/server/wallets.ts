import { PREDICTION_ENTRY_FEE, PREDICTION_WALLET_ID } from '$env/static/private';
import type { Player, Wallet } from '$lib/types';
import pb from './pocketbase';
import { createTransferLog } from './transfers';

export async function getWalletByIdQuery(walletId: string) {
	const wallet: Wallet = await pb.collection('wallets').getFirstListItem(`id='${walletId}'`);
	return wallet;
}

export async function getWalletByUserIdQuery(userId: string) {
	const wallet: Wallet = await pb.collection('wallets').getFirstListItem(`user='${userId}'`);
	return wallet;
}

export async function getAllWalletsQuery() {
	const wallets: Wallet[] = await pb.collection('wallets').getFullList();
	return wallets;
}

export async function updateWalletBalance(walletId: string, newBalance: number) {
	await pb.collection('wallets').update(walletId, { balance: newBalance });
}

export async function payOutWinnings(players: Player[]) {
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

	const playerPayoutAmount = Number(PREDICTION_ENTRY_FEE) / winners.length;

	for (const winner of winners) {
		const winnerWallet = await getWalletByUserIdQuery(winner.id);

		await transferFromPredictionWallet(playerPayoutAmount, winnerWallet.id);
	}
}

async function transferFromPredictionWallet(amount: number, targetWalletId: string) {
	try {
		const targetWallet = await getWalletByIdQuery(targetWalletId);
		const predictionWallet = await getWalletByIdQuery(PREDICTION_WALLET_ID);

		//remove from prediction wallet
		await pb
			.collection('wallets')
			.update(PREDICTION_WALLET_ID, { balance: predictionWallet.balance - amount });

		//add to target wallet
		await pb
			.collection('wallets')
			.update(targetWalletId, { balance: targetWallet.balance + amount });

		//log transfer
		await createTransferLog(
			'',
			targetWallet.user,
			PREDICTION_WALLET_ID,
			Number(PREDICTION_ENTRY_FEE),
			'transfer',
			targetWallet.id
		);
		return true;
	} catch (error) {
		return false;
	}
}
