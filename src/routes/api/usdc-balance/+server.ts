// src/routes/api/usdc-balance/+server.ts
import { json } from '@sveltejs/kit';
import { PublicKey } from '@solana/web3.js';
import { connection } from '$lib/server/solana';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export async function GET({ url }) {
	const address = url.searchParams.get('address');
	if (!address) return json({ error: 'Missing address' }, { status: 400 });

	const owner = new PublicKey(address);

	const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, { mint: USDC_MINT });
	let balance = 0;

	if (tokenAccounts.value.length > 0) {
		const amountInfo = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
		balance = parseFloat(amountInfo.uiAmountString);
	}

	return json({ balance });
}
