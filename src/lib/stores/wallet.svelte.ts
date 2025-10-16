import { connection } from '$lib/utils';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
// import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { WalletConnectWalletAdapter } from '@solana/wallet-adapter-walletconnect';

import type { PublicKey, Transaction } from '@solana/web3.js';

export let wallet = $state({
	connected: false,
	publicKey: null as string | null,
	adapter: null as SolflareWalletAdapter | null,
	sessionToken: null as string | null
});

export async function initWallet() {
	let adapter;

	const isMobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);

	if (isMobile) {
		// ✅ Use WalletConnect for Solflare mobile
		adapter = new WalletConnectWalletAdapter({
			network: WalletAdapterNetwork.Devnet,
			options: {
				projectId: '4efa7e2a208fcdf925b186da2061a942', // get from walletconnect.com
				metadata: {
					name: 'F1 League',
					description: 'F1 League',
					url: 'https://f1-league.hades.ws',
					icons: ['https://f1-league.hades.ws/logo.png']
				}
			}
		});
	} else {
		// ✅ Use direct Solflare adapter for desktop
		const { SolflareWalletAdapter } = await import('@solana/wallet-adapter-wallets');
		adapter = new SolflareWalletAdapter({ network: WalletAdapterNetwork.Devnet });
	}

	wallet.set({
		adapter,
		publicKey: null,
		connected: false
	});

	// auto-reconnect if already connected
	adapter.on('connect', () => {
		wallet.update((w) => ({
			...w,
			publicKey: adapter.publicKey,
			connected: true
		}));
	});

	adapter.on('disconnect', () => {
		wallet.update((w) => ({
			...w,
			publicKey: null,
			connected: false
		}));
	});
}

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
