import { form, query } from '$app/server';
import { env } from '$env/dynamic/private';
import { getPlayerWallet } from './players.remote';
import { transferBetweenWallets } from '$lib/server/wallets';
import { isPredictionEntryFeeBypassed } from '$lib/utils';
import * as v from 'valibot';

export const transferToSeasonWallet = form(v.object({ amount: v.number() }), async ({ amount }) => {
	try {
		const seasonWalletId = env.SEASON_WALLET_ID;
		if (!seasonWalletId) return false;

		const wallet = await getPlayerWallet();
		await transferBetweenWallets({
			amount: Number(amount),
			sourceWalletId: wallet.id,
			targetWalletId: seasonWalletId,
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

		const predictionEntryFee = Number(env.PREDICTION_ENTRY_FEE);
		return Number.isFinite(predictionEntryFee) && wallet.balance >= predictionEntryFee;
	} catch {
		return false;
	}
});
