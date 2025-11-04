// lib/stores/appkit.svelte.ts
import { browser, dev } from '$app/environment';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import {
	createTransferCheckedInstruction,
	getAssociatedTokenAddress,
	TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { PUBLIC_HELIUS_API_KEY, PUBLIC_PROJECT_ID } from '$env/static/public';
import { WalletConnectWalletAdapter } from '@solana/wallet-adapter-walletconnect';

// Constants
const TX_POLL_INTERVAL = 10000;
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Connection can be safely created both server & client side
export const connection = new Connection(
	`https://mainnet.helius-rpc.com/?api-key=${PUBLIC_HELIUS_API_KEY}`,
	'confirmed'
);

// Lazy adapter init — only in browser
let adapter: InstanceType<typeof WalletConnectWalletAdapter> | null = null;
if (browser && WalletConnectWalletAdapter) {
	adapter = new WalletConnectWalletAdapter({
		network: WalletAdapterNetwork.Mainnet,
		options: {
			relayUrl: 'wss://relay.walletconnect.com',
			projectId: PUBLIC_PROJECT_ID,
			metadata: {
				name: 'F1 League',
				description: 'F1 League game',
				url: dev ? 'http://localhost:5173' : 'https://f1-league.hades.ws',
				icons: dev ? ['http://localhost:5173/logo.png'] : ['https://f1-league.hades.ws/logo.png']
			}
		}
	});
}

// Wallet state
export const wallet: {
	adapter: typeof adapter;
	connected: boolean;
	connecting: boolean;
	publicKey: PublicKey | null;
	balanceUSDC: number;
	balanceSOL: number;
	txTimer: NodeJS.Timeout | undefined;
	transactions: {
		signature: string;
		slot: number;
		amount: number;
		authority: string;
		source: string;
		destination: string;
		transferIn: boolean;
	}[];
} = $state({
	adapter,
	connected: false,
	connecting: false,
	publicKey: null,
	balanceUSDC: 0,
	balanceSOL: 0,
	txTimer: undefined,
	transactions: []
});

// Attach adapter events (browser only)
if (browser && adapter) {
	adapter.on('connect', () => {
		console.log('Wallet connected');
		wallet.connected = true;
		wallet.connecting = false;
		wallet.publicKey = adapter!.publicKey;
		getWalletBalanceUSDC();
	});

	adapter.on('disconnect', () => {
		wallet.connected = false;
		wallet.connecting = false;
		wallet.publicKey = null;
	});

	adapter.on('error', (err: unknown) => {
		console.error('Wallet error:', err);
	});
}

// ------------------------------
// Wallet Functions
// ------------------------------

export async function restoreWallet() {
	if (!browser || !wallet.adapter) return;
	console.log('Restoring WalletConnect session...');
	await wallet.adapter.connect(); // silent restore (no modal)
	pollTxs();
}

export async function getWalletBalanceUSDC() {
	if (!browser || !wallet.adapter?.publicKey) return;

	try {
		const ata = await getAssociatedTokenAddress(USDC_MINT, wallet.adapter.publicKey);
		const balanceInfo = await connection.getTokenAccountBalance(ata);
		wallet.balanceUSDC = parseFloat(balanceInfo.value.uiAmountString ?? '0');
	} catch (err: unknown) {
		console.error('Error fetching USDC balance:', err);
		wallet.balanceUSDC = 0;
	}
}

export async function sendUSDC(
	fromWalletAddress: string,
	toWalletAddress: string,
	usdAmount = 1,
	memoText = ''
) {
	if (!browser || !wallet.adapter?.publicKey) {
		throw new Error('Wallet not connected or not in browser');
	}

	const fromPubKey = new PublicKey(fromWalletAddress);
	const toPubKey = new PublicKey(toWalletAddress);

	const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, fromPubKey);
	const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, toPubKey);

	const decimals = 6;
	const tokenAmount = BigInt(Math.floor(usdAmount * 10 ** decimals));

	const transferIx = createTransferCheckedInstruction(
		fromTokenAccount,
		USDC_MINT,
		toTokenAccount,
		fromPubKey,
		tokenAmount,
		decimals,
		[],
		TOKEN_PROGRAM_ID
	);

	const memoIx = new TransactionInstruction({
		programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
		keys: [],
		data: Buffer.from(memoText, 'utf8')
	});

	const tx = new Transaction().add(transferIx, memoIx);

	try {
		const signature = await wallet.adapter.sendTransaction(tx, connection);
		console.log('Signature:', signature);
		return { signature, hasFailed: false };
	} catch (error) {
		console.error('❌ Error sending transaction:', error);
		return { signature: null, hasFailed: true, error };
	}
}

export async function fetchTxs() {
	if (!browser || !wallet.connected || !wallet.adapter?.publicKey) return;

	try {
		const res = await fetch(`/api/transactions?address=${wallet.adapter.publicKey.toBase58()}`);
		const data = await res.json();
		if (!data.transactions) return;

		for (const tx of data.transactions) {
			const exists = wallet.transactions.some((t) => t.signature === tx.signature);
			if (!exists) wallet.transactions = [...wallet.transactions, tx];
		}
		if (data.balance !== undefined) wallet.balanceUSDC = data.balance;
	} catch (err) {
		console.error('Error fetching transactions:', err);
	}
}

export function pollTxs() {
	if (!browser) return;
	if (!wallet.txTimer) {
		fetchTxs();
		wallet.txTimer = setInterval(fetchTxs, TX_POLL_INTERVAL);
		return () => clearInterval(wallet.txTimer);
	}
}
