<script lang="ts">
	import { pollTxs, restoreWallet, wallet } from '$lib/stores/wallet.svelte';
	import { shortAddress } from '$lib/utils';
	import { onDestroy, onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import WalletCard from './WalletCard.svelte';

	onMount(async () => {
		await restoreWallet();
	});
	onDestroy(() => {
		clearInterval(wallet.txTimer);
	});

	$effect(() => {
		//as soon as wallet is connected, we poll transactions
		if (wallet.connected) {
			pollTxs();
		}
	});
</script>

{#if wallet.connected}
	<WalletCard />
{/if}

{#if !wallet.connected}
	<div in:fade class="card h-full w-full overflow-auto bg-base-100">
		<div class="card-body"></div>
	</div>
	<button
		class="btn btn-primary"
		onclick={() => {
			pollTxs();
			wallet.adapter.connect();
			console.log('Wallet connected', wallet.connecting);
		}}>Connect Wallet</button
	>
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
				class="list-row items-center hover:cursor-pointer hover:bg-base-content/10"
			>
				<div>{shortAddress(transaction.signature)}</div>
				{#if transaction.transferIn}
					<div>
						<div>{shortAddress(transaction.source)}</div>
						<div class="text-xs font-semibold opacity-60">
							{shortAddress(transaction.authority)}
						</div>
					</div>
					<div class="text-2xl text-success">
						{'+' + transaction.amount}
					</div>
				{:else}
					<div>
						<div>{shortAddress(transaction.destination)}</div>
						<div class="text-xs font-semibold opacity-60">
							{shortAddress(transaction.authority)}
						</div>
					</div>
					<div class="text-2xl">
						{transaction.amount}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
