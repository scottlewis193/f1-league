import { PUBLIC_HELIUS_API_KEY } from '$env/static/public';
import { Connection } from '@solana/web3.js';

export const connection = new Connection(
	'https://mainnet.helius-rpc.com/?api-key=' + PUBLIC_HELIUS_API_KEY
);
