import { query } from '$app/server';
import { env } from '$env/dynamic/private';
import { getWalletByIdQuery } from '$lib/server/wallets';

export const getSeasonWallet = query(async () => {
	return getWalletByIdQuery(env.SEASON_WALLET_ID!);
});
