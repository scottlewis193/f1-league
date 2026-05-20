import { form, query } from '$app/server';
import { env } from '$env/dynamic/private';
import { getWalletByIdQuery } from '$lib/server/wallets';
import { getPlayerWallet } from './players.remote';
import pb from '$lib/server/pocketbase';
import { createTransferLog } from '$lib/server/transfers';
import * as v from 'valibot';

export const transferToPredictionWallet = query(async () => {
	try {
		const wallet = await getPlayerWallet();
		const predictionWallet = await getWalletByIdQuery(env.PREDICTION_WALLET_ID!);

		//remove from player wallet
		await pb
			.collection('wallets')
			.update(wallet.id, { balance: Number(wallet.balance) - Number(env.PREDICTION_ENTRY_FEE) });

		//add to prediction wallet
		await pb.collection('wallets').update(env.PREDICTION_WALLET_ID!, {
			balance: Number(predictionWallet.balance) + Number(env.PREDICTION_ENTRY_FEE)
		});

		//log transfer
		await createTransferLog(
			'',
			wallet.user,
			wallet.id,
			Number(env.PREDICTION_ENTRY_FEE),
			'transfer',
			env.PREDICTION_WALLET_ID!
		);
		return true;
	} catch (error) {
		return false;
	}
});

export const transferToSeasonWallet = form(v.object({ amount: v.number() }), async ({ amount }) => {
	try {
		const wallet = await getPlayerWallet();
		const predictionWallet = await getWalletByIdQuery(env.SEASON_WALLET_ID!);

		//remove from player wallet
		await pb.collection('wallets').update(wallet.id, { balance: wallet.balance - Number(amount) });

		//add to season wallet
		await pb
			.collection('wallets')
			.update(env.SEASON_WALLET_ID!, { balance: predictionWallet.balance + amount });

		//log transfer
		await createTransferLog(
			'',
			wallet.user,
			wallet.id,
			Number(amount),
			'transfer',
			env.SEASON_WALLET_ID!
		);
		return true;
	} catch (error) {
		return false;
	}
});

export const playerWalletHasEnoughBalance = query(async () => {
	try {
		const wallet = await getPlayerWallet();

		return wallet.balance >= Number(env.PREDICTION_ENTRY_FEE);
	} catch (error) {
		return false;
	}
});
