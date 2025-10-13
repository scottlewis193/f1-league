import { browser } from '$app/environment';
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';

const isDev = import.meta.env.MODE !== 'production';

export const connection = new Connection(
	isDev ? clusterApiUrl('devnet') : 'https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY',
	'confirmed'
);

// --- Wallet state ---
export const wallet = $state({
	connected: false,
	publicKey: null as PublicKey | null,
	provider: null as any, // Phantom provider
	balance: 0, // SOL balance
	usdcBalance: 0 // USDC balance (optional)
});

// --- Connection logic ---
export async function connect() {
	if (!browser) return;

	try {
		const provider = window?.phantom?.solana || window?.solana;
		if (!provider?.isPhantom) {
			return;
		}

		const resp = await provider.connect();

		wallet.provider = provider;
		wallet.publicKey = new PublicKey(resp.publicKey.toString());
		wallet.connected = true;

		provider.on('disconnect', () => {
			resetWallet();
		});

		console.log('Connected to wallet:', wallet.publicKey.toBase58());
		await updateBalances();
	} catch (err) {
		console.error('Wallet connect failed:', err);
	}
}

// --- Disconnect logic ---
export async function disconnect() {
	if (!browser || !wallet.provider) return;
	await wallet.provider.disconnect();
	resetWallet();
}

function resetWallet() {
	wallet.connected = false;
	wallet.publicKey = null;
	wallet.balance = 0;
	wallet.usdcBalance = 0;
	wallet.provider = null;
}

// --- Balance updater ---
export async function updateBalances() {
	if (!browser || !wallet.connected || !wallet.publicKey) return;

	const solBalance = await connection.getBalance(wallet.publicKey);
	wallet.balance = solBalance / 1e9; // lamports → SOL
}
