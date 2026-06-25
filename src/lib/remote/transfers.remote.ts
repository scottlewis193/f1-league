import { form, query } from '$app/server';
import { PREDICTION_ENTRY_FEE, SEASON_WALLET_ID } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { getPlayerWallet } from './players.remote';
import { transferBetweenWallets } from '$lib/server/wallets';
import { isPredictionEntryFeeBypassed } from '$lib/utils';
import * as v from 'valibot';

export const transferToSeasonWallet = form(v.object({ amount: v.number() }), async ({ amount }) => {
	try {
		const wallet = await getPlayerWallet();
		await transferBetweenWallets({
			amount: Number(amount),
			sourceWalletId: wallet.id,
			targetWalletId: SEASON_WALLET_ID,
			userId: wallet.user
		});
		return true;
	} catch {
		return false;
	}
});

export const playerWalletHasEnoughBalance = query(async () => {
	try {
		const wallet = await getPlayerWallet();

		if (isPredictionEntryFeeBypassed(wallet.user, env.PREDICTION_ENTRY_FEE_BYPASS_USER_IDS ?? ''))
			return true;

		return wallet.balance >= Number(PREDICTION_ENTRY_FEE);
	} catch {
		return false;
	}
});
