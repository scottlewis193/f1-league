<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import WalletCard from './WalletCard.svelte';
	import WithdrawDialog from './WithdrawDialog.svelte';
	import DepositDialog from './DepositDialog.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { getPlayerLocal, getPlayerWallet } from '$lib/remote/players.remote';
	import type { TransferLog, Wallet } from '$lib/types';
	import pb from '$lib/pocketbase';

	//svelte-ignore non_reactive_update
	let withdrawDialog: ReturnType<typeof WithdrawDialog>;
	//svelte-ignore non_reactive_update
	let depositDialog: ReturnType<typeof DepositDialog>;
	let wallet: Wallet | undefined = $state();
	let userTransferLogs = $state<TransferLog[]>([]);

	$inspect(wallet);

	//poll transfers using pocketbase subscribe TO DO
	async function subscribeToTransfers() {
		const player = await getPlayerLocal();
		if (!player) return;

		userTransferLogs = await pb.collection('transfer_logs').getFullList<TransferLog>({
			filter: `wallet = "${wallet?.id}" || targetWallet = "${wallet?.id}"`,
			sort: '-created'
		});

		pb.collection('transfer_logs').subscribe('*', async (event) => {
			if (!wallet) return;
			if (event.action === 'create' && event.record.wallet == wallet.id) {
				userTransferLogs.unshift(event.record as unknown as TransferLog);
			}
		});
		if (!wallet) return;
		pb.collection('wallets').subscribe(wallet.id, async (event) => {
			if (event.action === 'update') {
				wallet = event.record as unknown as Wallet;
			}
		});
	}

	onMount(async () => {
		if (!wallet) wallet = await getPlayerWallet();
		await subscribeToTransfers();
	});

	onDestroy(() => {
		pb.collection('transfer_logs').unsubscribe();
		pb.collection('wallets').unsubscribe();
	});
</script>

{#if wallet}
	<WithdrawDialog bind:this={withdrawDialog} />

	<DepositDialog bind:this={depositDialog} walletId={wallet.id} />

	<WalletCard {wallet} withdraw={withdrawDialog.showModal} deposit={depositDialog.showModal} />
{/if}

<!-- Transactions -->
<ul in:fade class="list h-full overflow-auto rounded-box bg-base-100 p-3 shadow-md">
	<li class="p-4 pb-2 text-xs tracking-wide opacity-60">Transactions</li>
	{#each userTransferLogs as transferLog (transferLog.id)}
		{@const date = new Date().toLocaleDateString('gb', { day: 'numeric', month: 'short' })}
		<li
			animate:flip
			in:fade
			class="list-row w-full items-center hover:cursor-pointer hover:bg-base-content/10"
		>
			<div class="w-22">{date}</div>
			<div class="">
				<div>{transferLog.id}</div>
			</div>
			{#if transferLog.type == 'deposit' || (transferLog.type == 'transfer' && transferLog.targetWallet == (wallet?.id ?? 0))}
				<div class="w-auto text-left text-2xl text-success">
					{'+' + transferLog.amount.toFixed(2)}
				</div>
			{:else if transferLog.type == 'withdraw' || (transferLog.type == 'transfer' && transferLog.wallet == (wallet?.id ?? 0))}
				<div class="w-auto text-left text-2xl">
					{transferLog.amount.toFixed(2)}
				</div>
			{/if}
		</li>
	{/each}
</ul>
