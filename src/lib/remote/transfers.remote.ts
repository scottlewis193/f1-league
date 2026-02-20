import { getRequestEvent, query } from '$app/server';
import { PREDICTION_WALLET_ID } from '$env/static/private';
import { createTransferLog } from '$lib/server/data';
import { getPlayerWallet } from './players.remote';
import * as v from 'valibot';

export const transferToPredictionWallet = query(
	v.object({ amount: v.number() }),
	async ({ amount }) => {
		const event = getRequestEvent();
		const pb = event.locals.pb;
		const wallet = await getPlayerWallet();

		//remove from player wallet
		await pb.collection('wallets').update(wallet.id, { balance: wallet.balance - amount });

		//add to prediction wallet
		await pb
			.collection('wallets')
			.update(PREDICTION_WALLET_ID, { balance: wallet.balance + amount });

		//log transfer
		await createTransferLog(
			'',
			wallet.user,
			wallet.id,
			amount,
			'transfer',
			PREDICTION_WALLET_ID,
			pb
		);
	}
);
