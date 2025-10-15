import { connection } from '$lib/utils';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import type { PublicKey, Transaction } from '@solana/web3.js';

export let wallet = $state({
	connected: false,
	publicKey: null as string | null,
	adapter: null as SolflareWalletAdapter | null,
	sessionToken: null as string | null
});

export async function connectWallet() {
	const adapter = new SolflareWalletAdapter();
	wallet.adapter = adapter;

	try {
		await adapter.connect();
		const pk = adapter.publicKey?.toBase58();
		if (!pk) return;

		// Sign a one-time message
		const message = `Sign this to login: ${Date.now()}`;
		const encoded = new TextEncoder().encode(message);
		const signature = await adapter.signMessage(encoded);

		// Send to SvelteKit endpoint
		const res = await fetch('/api/auth', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ publicKey: pk, message, signature: Array.from(signature) })
		});
		const data = await res.json();
		wallet.sessionToken = data.token;
		wallet.publicKey = pk;
		wallet.connected = true;
	} catch (err) {
		console.error(err);
	}
}

export async function disconnectWallet() {
	if (wallet.adapter?.connected) await wallet.adapter.disconnect();
}

export async function restoreSession() {
	const token = wallet.sessionToken;
	if (!token) return;

	try {
		const res = await fetch(`/api/session/${token}`);
		if (!res.ok) return;
		const data = await res.json();
		if (data.publicKey) {
			wallet.publicKey = data.publicKey;
			wallet.connected = true;
		}
	} catch (err) {
		console.error(err);
	}
}

export async function signAndSendTx(transaction: Transaction) {
	const adapter = wallet.adapter;
	if (!adapter || !adapter.connected) throw new Error('Wallet not connected');

	try {
		// Attach latest blockhash before signing
		const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
		transaction.recentBlockhash = blockhash;
		transaction.feePayer = adapter.publicKey as PublicKey;

		// Sign
		const signedTx = await adapter.signTransaction(transaction);

		// Send
		const txId = await connection.sendRawTransaction(signedTx.serialize());

		// Confirm (modern syntax)
		await connection.confirmTransaction({
			signature: txId,
			blockhash,
			lastValidBlockHeight
		});

		console.log('✅ Transaction confirmed:', txId);
		return txId;
	} catch (err) {
		console.error('Transaction failed:', err);
		throw err;
	}
}
