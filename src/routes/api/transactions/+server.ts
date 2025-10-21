import { json } from '@sveltejs/kit';
import { PublicKey, type ConfirmedSignatureInfo } from '@solana/web3.js';
import { connection } from '$lib/appkit.svelte.js';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Keep state in memory while the server stays warm
let lastSignature: string | null = null;
let cachedTxs: any[] = [];
let cachedBalance: number | null = null;

export async function GET({ url }) {
	const address = url.searchParams.get('address');
	if (!address) return json({ error: 'Missing address' }, { status: 400 });

	const pubKey = new PublicKey(address);

	try {
		// Step 1: get signatures since last known
		const signatures = await connection.getSignaturesForAddress(pubKey, {
			limit: 10
		});

		// no new sigs → return cached
		if (signatures.length === 0) {
			return json({ transactions: cachedTxs, balance: cachedBalance });
		}

		// only new signatures
		const newSigs = lastSignature
			? signatures.filter((sig) => sig.signature !== lastSignature)
			: signatures;

		if (newSigs.length === 0) {
			return json({ transactions: cachedTxs, balance: cachedBalance });
		}

		// Step 2: fetch full parsed transactions for new signatures
		const txns = await fetchInBatches(newSigs);

		// Step 3: find user's USDC token account
		const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
			mint: USDC_MINT
		});
		if (tokenAccounts.value.length === 0) return json({ transactions: [], balance: 0 });

		const userTokenAccount = tokenAccounts.value[0].pubkey.toBase58();

		// Step 4: extract USDC transfers
		const newTransfers: {
			signature: string;
			slot: number;
			amount: number;
			source: string;
			walletSource: string;
			destination: string;
			transferIn: boolean;
		}[] = [];

		for (const tx of txns) {
			if (!tx) continue;
			for (const instr of tx.transaction.message.instructions) {
				//@ts-ignore
				if (instr.program === 'spl-token' && instr.parsed?.type === 'transferChecked') {
					//@ts-ignore
					const info = instr.parsed.info;
					if (info.mint === USDC_MINT.toBase58()) {
						newTransfers.push({
							signature: tx.transaction.signatures[0],
							slot: tx.slot,
							amount: info.tokenAmount.uiAmount,
							source: info.source,
							walletSource: info.authority,
							destination: info.destination,
							transferIn: info.destination === userTokenAccount
						});
					}
				}
			}
		}

		// Step 5: update latest signature + cached txs
		lastSignature = signatures[0]?.signature || lastSignature;
		cachedTxs = [...newTransfers, ...cachedTxs].slice(0, 50);

		// Step 6: if there were new transfers, refresh balance
		if (newTransfers.length > 0 || cachedBalance === null) {
			const balRes = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
			cachedBalance = balRes.value.uiAmount;
		}

		return json({ transactions: cachedTxs, balance: cachedBalance });
	} catch (err) {
		console.error('Transaction poll error:', err);
		return json({ error: 'Failed to fetch transactions' }, { status: 500 });
	}
}

async function fetchInBatches(signatures: ConfirmedSignatureInfo[], batchSize = 5) {
	const results = [];

	for (let i = 0; i < signatures.length; i += batchSize) {
		const batch = signatures.slice(i, i + batchSize);
		const batchResults = await Promise.all(
			batch.map((sig) => connection.getParsedTransaction(sig.signature))
		);

		results.push(...batchResults);
		await new Promise((r) => setTimeout(r, 300)); // small pause between batches
	}

	return results;
}
