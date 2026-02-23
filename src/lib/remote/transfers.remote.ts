import { query } from '$app/server';
import { PREDICTION_WALLET_ID, PREDICTION_ENTRY_FEE } from '$env/static/private';
import { getWalletByIdQuery } from '$lib/server/wallets';
import { getPlayerWallet } from './players.remote';
import pb from '$lib/server/pocketbase';
import { createTransferLog } from '$lib/server/transfers';

export const transferToPredictionWallet = query(async () => {
	try {
		const wallet = await getPlayerWallet();
		const predictionWallet = await getWalletByIdQuery(PREDICTION_WALLET_ID);

		//remove from player wallet
		await pb
			.collection('wallets')
			.update(wallet.id, { balance: wallet.balance - Number(PREDICTION_ENTRY_FEE) });

		//add to prediction wallet
		await pb
			.collection('wallets')
			.update(PREDICTION_WALLET_ID, { balance: predictionWallet.balance + PREDICTION_ENTRY_FEE });

		//log transfer
		await createTransferLog(
			'',
			wallet.user,
			wallet.id,
			Number(PREDICTION_ENTRY_FEE),
			'transfer',
			PREDICTION_WALLET_ID
		);
		return true;
	} catch (error) {
		return false;
	}
});

export const playerWalletHasEnoughBalance = query(async () => {
	try {
		const wallet = await getPlayerWallet();

		return wallet.balance >= Number(PREDICTION_ENTRY_FEE);
	} catch (error) {
		return false;
	}
});
