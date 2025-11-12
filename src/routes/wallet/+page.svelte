<script lang="ts">
	import { pollTxs, wallet } from '$lib/stores/wallet.svelte';
	import { shortAddress, withTimeout } from '$lib/utils';
	import { onDestroy, onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import WalletCard from './WalletCard.svelte';

	onMount(() => {
		// silent restore (no modal)
		console.log('Restoring wallet...');
		wallet.connecting = true;
		if (!wallet.adapter) return;
		withTimeout(wallet.adapter.autoConnect(), 2000)
			.then(() => {
				wallet.connected = true;
				console.log('Wallet restored');
				pollTxs();
			})
			.catch((error) => {
				wallet.connecting = false;
				console.error('Failed to restore wallet:', error);
			});
	});

	$effect(() => {
		if (wallet.connected) {
			console.log('Wallet connected');
			pollTxs();
			wallet.connecting = false;
		}
	});

	onDestroy(() => {
		clearInterval(wallet.txTimer);
	});
</script>

{#if wallet.connected}
	<WalletCard />
{/if}

{#if wallet.connecting}
	<div in:fade class="card h-full w-full overflow-auto bg-base-100">
		<div class="card-body flex items-center justify-center">
			{#if wallet.connecting}
				Connecting Wallet...
				<div class="loading loading-lg"></div>
			{:else if !wallet.connected}
				<button
					class="btn btn-primary"
					onclick={() => {
						wallet.adapter?.autoConnect();
					}}>Connect Wallet</button
				>
			{/if}
		</div>
	</div>
{:else}
	<!-- Transactions -->
	<ul in:fade class="list h-full overflow-auto rounded-box bg-base-100 p-3 shadow-md">
		<li class="p-4 pb-2 text-xs tracking-wide opacity-60">Transactions</li>
		{#each wallet.transactions as transaction (transaction.signature)}
			<li
				animate:flip
				in:fade
				onclick={() => {
					window.open('https://solscan.io/tx/' + transaction.signature, '_blank');
				}}
				class="list-row w-full items-center hover:cursor-pointer hover:bg-base-content/10"
			>
				<div class="w-22">{shortAddress(transaction.signature)}</div>
				{#if transaction.transferIn}
					<div class="w-22">
						<div>{shortAddress(transaction.source)}</div>
						<div class="text-xs font-semibold opacity-60">
							{shortAddress(transaction.authority)}
						</div>
					</div>
					<div class="w-auto text-left text-2xl text-success">
						{'+' + transaction.amount}
					</div>
				{:else}
					<div class="w-22">
						<div>{shortAddress(transaction.destination)}</div>
						<div class="text-xs font-semibold opacity-60">
							{shortAddress(transaction.authority)}
						</div>
					</div>
					<div class="w-auto text-left text-2xl">
						{transaction.amount}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
