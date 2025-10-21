<script lang="ts">
	import { appKit, getWalletAddress } from '$lib/appkit.svelte';
	import { shortAddress } from '$lib/utils';
	import type { PublicStateControllerState } from '@reown/appkit';
	import { text } from '@sveltejs/kit';
	import { onDestroy, onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { get } from 'svelte/store';
	import { fade } from 'svelte/transition';

	let address = $state('');
	let balance = $state(0);
	let transactions: {
		signature: string;
		slot: number;
		amount: number;
		walletSource: string;
		source: string;
		destination: string;
		transferIn: boolean;
	}[] = $state([]);
	let _showToast = $state(false);
	let toastText = $state('');
	let appKitInitialized: boolean = $state(false);

	const POLL_INTERVAL = 10000;
	let timer: string | number | NodeJS.Timeout | undefined;

	function openModal() {
		appKit?.open();
	}

	function getCSSVarValue(varName: string) {
		return window.getComputedStyle(document.body).getPropertyValue(varName);
	}

	function setCSSVarValue(varName: string, value: string) {
		const r = document.querySelector(':root') as HTMLElement;
		r.style.setProperty(varName, value);
	}

	function openConnectModal() {
		appKit?.open({ view: 'Connect' });
	}

	function openAccountModal() {
		appKit?.open({ view: 'Account' });
	}

	function fundWithCoinbase() {
		if (!address) {
			alert('Please connect your wallet first.');
			return;
		}

		// Coinbase’s send crypto link (works for mobile + desktop)
		const url = `https://www.coinbase.com/advanced-trade/usdc-gbp`;
		window.open(url, '_blank');
	}

	function copyAddress() {
		if (!address) return;
		navigator.clipboard.writeText(address);
		showToast('Wallet address copied');
	}

	function showToast(text: string) {
		toastText = text;
		_showToast = true;
		setTimeout(() => {
			_showToast = false;
		}, 2000);
	}

	async function usdToGbp(usdAmount: number) {
		const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=GBP');
		const data = await res.json();
		const rate = data.rates.GBP; // e.g., 0.80
		return usdAmount * rate;
	}

	async function getUSDCBalance(address: string) {
		const res = await fetch(`/api/usdc-balance?address=${address}`);
		const data = await res.json();
		balance = data.balance;
	}

	async function fetchTxs() {
		const res = await fetch(`/api/transactions?address=${address}`);
		const data = await res.json();
		if (!data.transactions) return;

		// Add only new transactions
		for (const tx of data.transactions) {
			const exists = transactions.some((t) => t.signature === tx.signature);
			if (!exists) transactions = [tx, ...transactions]; // add to start
		}

		if (data.balance !== undefined) balance = data.balance;
	}

	$inspect(transactions);

	onMount(() => {
		//set appkit theme
		setCSSVarValue(
			'--apkt-tokens-theme-backgroundPrimary-base',
			getCSSVarValue('--color-base-200')
		);
		setCSSVarValue('--apkt-tokens-theme-textPrimary', getCSSVarValue('--color-secondary-content'));
		setCSSVarValue('--apkt-tokens-theme-textSecondary', getCSSVarValue('--color-base-content'));
		setCSSVarValue('--apkt-borderRadius-8', getCSSVarValue('--radius-box'));
		setCSSVarValue('--apkt-tokens-theme-borderPrimaryDark', '#000');
		setCSSVarValue('--apkt-tokens-theme-foregroundPrimary', getCSSVarValue('--color-base-100'));
		setCSSVarValue(
			'--apkt-tokens-theme-foregroundSecondary',
			'color-mix(in oklab, var(--btn-color, var(--color-base-100) /* var(--color-base-100) */), #000 7%)'
		);

		//get wallet address and balance
		setTimeout(async () => {
			address = getWalletAddress();
			appKitInitialized = true;
			//poll transactions
			fetchTxs();
			timer = setInterval(fetchTxs, POLL_INTERVAL);
			return () => clearInterval(timer);
		}, 250);
	});
</script>

{#if !address && appKitInitialized}
	<button class="btn btn-primary" onclick={openModal}>Connect Wallet</button>
{/if}
<!-- Wallet -->
{#if address}
	<div in:fade class="card w-full bg-primary">
		<div class="card-body text-primary-content">
			<div class="flex justify-between">
				<h2 class="card-title">Wallet</h2>
				<h4 class="card-title">{(await usdToGbp(balance)).toFixed(2)} GBP ({balance} USDC)</h4>
			</div>
			<p>{address}</p>
			<div class="flex w-full">
				<div class="card-actions flex w-full justify-start">
					<button class="btn btn-sm btn-neutral" onclick={openAccountModal}>View Account</button>
					<button onclick={fundWithCoinbase} class="btn btn-sm btn-neutral">Fund Wallet</button>
				</div>
				<div class="card-actions flex w-full justify-end">
					<button class="btn btn-sm btn-neutral" onclick={copyAddress}>Copy Address</button>
				</div>
			</div>
		</div>
	</div>
	<!-- Transactions -->

	<ul in:fade class="list h-full overflow-auto rounded-box bg-base-100 p-3 shadow-md">
		<li class="p-4 pb-2 text-xs tracking-wide opacity-60">Transactions</li>
		{#each transactions as transaction (transaction.signature)}
			<li
				animate:flip
				in:fade
				onclick={() => {
					window.location.href = 'https://solscan.io/tx/' + transaction.signature;
				}}
				class="list-row items-center hover:cursor-pointer hover:bg-base-content/10"
			>
				<div>{shortAddress(transaction.signature)}</div>
				<div>{shortAddress(transaction.walletSource)}</div>
				<div>{shortAddress(transaction.source)}</div>
				<div>{shortAddress(transaction.destination)}</div>
				<div
					class="text-2xl"
					class:text-success={transaction.transferIn}
					class:text-error={!transaction.transferIn}
				>
					{transaction.transferIn ? '+' : '-'}{transaction.amount}
				</div>
			</li>
		{/each}
	</ul>
{/if}

<!-- {/if} -->

{#if _showToast}
	<div class="toast">
		<div class="alert alert-info">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				class="h-6 w-6 shrink-0 stroke-current"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				></path>
			</svg>
			<span>{toastText}</span>
		</div>
	</div>
{/if}
