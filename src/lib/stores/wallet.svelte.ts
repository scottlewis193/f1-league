// lib/stores/appkit.svelte.ts
import { dev } from '$app/environment';

import { WalletConnectWalletAdapter } from '@solana/wallet-adapter-walletconnect';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
	Connection,
	PublicKey,
	SystemProgram,
	Transaction,
	TransactionInstruction,
	sendAndConfirmTransaction
} from '@solana/web3.js';
import {
	createAssociatedTokenAccountInstruction,
	createTransferCheckedInstruction,
	getAssociatedTokenAddress,
	getOrCreateAssociatedTokenAccount,
	TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { PUBLIC_HELIUS_API_KEY, PUBLIC_PROJECT_ID } from '$env/static/public';
import { updateCurrentPlayerWalletAddress } from '../remote/players.remote';
import { hasWalletConnectSession } from '../walletSessionCheck';

const TX_POLL_INTERVAL = 10000;
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

const adapter = new WalletConnectWalletAdapter({
	network: WalletAdapterNetwork.Mainnet,
	options: {
		relayUrl: 'wss://relay.walletconnect.com',
		projectId: PUBLIC_PROJECT_ID, // required from https://cloud.walletconnect.com
		metadata: {
			name: 'F1 League',
			description: 'F1 League game',
			url: dev
				? 'https://unsceptical-incogitantly-jazmin.ngrok-free.dev'
				: 'https://f1-league.hades.ws',
			icons: dev
				? ['https://unsceptical-incogitantly-jazmin.ngrok-free.dev/logo.png']
				: ['https://f1-league.hades.ws/logo.png']
		}
	}
});

export const connection = new Connection(
	`https://mainnet.helius-rpc.com/?api-key=${PUBLIC_HELIUS_API_KEY}`,
	'confirmed'
);

export const wallet: {
	adapter: WalletConnectWalletAdapter;
	connected: boolean;
	publicKey: PublicKey | null;
	connecting: boolean;
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
	connected: adapter.connected,
	publicKey: adapter.publicKey,
	connecting: adapter.connecting,
	balanceUSDC: 0,
	balanceSOL: 0,
	txTimer: undefined,
	transactions: []
});

adapter.on('connect', () => {
	if (!adapter.publicKey) return;
	wallet.connected = true;
	wallet.publicKey = adapter.publicKey;
	getWalletBalanceUSDC();
});

adapter.on('disconnect', () => {
	wallet.connected = false;
	wallet.publicKey = null;
});

adapter.on('error', (err) => {
	console.error('Wallet error:', err);
	wallet.connected = false;
	wallet.publicKey = null;
});

export async function restoreWallet() {
	if (await hasWalletConnectSession()) {
		console.log('Restoring WalletConnect session...');
		await wallet.adapter.connect(); // silent restore (no modal)
	} else {
		console.log('No active WalletConnect session');
	}
}

export async function getWalletBalanceUSDC() {
	if (!wallet.publicKey) throw new Error('Wallet not connected');

	try {
		// Derive the Associated Token Account (ATA) for USDC
		const ata = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);

		// Fetch the balance
		const balanceInfo = await connection.getTokenAccountBalance(ata);

		// Return as number
		const balance = parseFloat(balanceInfo.value.uiAmountString ?? '0');
		wallet.balanceUSDC = balance;
	} catch (err: any) {
		// If ATA doesn’t exist yet, the user has 0 USDC
		if (err.message?.includes('Invalid param: account')) {
			wallet.balanceUSDC = 0;
		}
		console.error('Error fetching USDC balance:', err);
		wallet.balanceUSDC = 0;
	}
}

const USDC_METADATA = {
	symbol: 'USDC',
	name: 'USD Coin',
	logoURI:
		'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
	decimals: 6
};

export async function sendUSDC(fromWalletAddress: string, toWalletAddress: string, usdAmount = 1) {
	if (!wallet.publicKey) throw new Error('Wallet not connected');

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

	const memoText = `F1 League: Send ${usdAmount.toFixed(2)} USDC`;
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
	if (!wallet.connected) return;
	const res = await fetch(`/api/transactions?address=${wallet.publicKey?.toBase58()}`);
	const data = await res.json();
	if (!data.transactions) return;
	// Add only new transactions
	for (const tx of data.transactions) {
		const exists = wallet.transactions.some((t) => t.signature === tx.signature);
		if (!exists) wallet.transactions = [...wallet.transactions, tx];
	}
	if (data.balance !== undefined) wallet.balanceUSDC = data.balance;
}

export function pollTxs() {
	if (!wallet.txTimer) {
		fetchTxs();
		wallet.txTimer = setInterval(fetchTxs, TX_POLL_INTERVAL);
		return () => clearInterval(wallet.txTimer);
	}
}
