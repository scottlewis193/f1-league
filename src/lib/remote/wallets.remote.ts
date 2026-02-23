import { query } from '$app/server';
import { SEASON_WALLET_ID } from '$env/static/private';
import { getWalletByIdQuery } from '$lib/server/wallets';
import * as v from 'valibot';

export const getWalletById = query(v.string(), async (id) => {
	return getWalletByIdQuery(id);
});

export const getSeasonWallet = query(async () => {
	return getWalletByIdQuery(SEASON_WALLET_ID);
});
