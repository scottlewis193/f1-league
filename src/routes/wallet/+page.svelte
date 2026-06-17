<script lang="ts">
	import { flip } from 'svelte/animate';
	import WalletCard from './WalletCard.svelte';
	import WithdrawDialog from './WithdrawDialog.svelte';
	import DepositDialog from './DepositDialog.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { getPlayerLocal, getPlayerWallet } from '$lib/remote/players.remote';
	import type { TransferLog, Wallet } from '$lib/types';
	import pb from '$lib/pocketbase';
	import type { RecordSubscription } from 'pocketbase';
	import PageCard from '$lib/components/PageCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import {
		formatTransferAmount,
		formatTransferDate,
		formatTransferType,
		isIncomingTransfer
	} from '$lib/domain/wallets';

	//svelte-ignore non_reactive_update
	let withdrawDialog: ReturnType<typeof WithdrawDialog>;
	//svelte-ignore non_reactive_update
	let depositDialog: ReturnType<typeof DepositDialog>;
	let wallet: Wallet | undefined = $state();
	let userTransferLogs = $state<TransferLog[]>([]);

	//poll transfers using pocketbase subscribe TO DO
	async function subscribeToTransfers() {
		const player = await getPlayerLocal();
		if (!player) return;

		userTransferLogs = await pb.collection('transfer_logs').getFullList({
			filter: `wallet = "${wallet?.id}" || targetWallet = "${wallet?.id}"`,
			sort: '-created'
		});

		pb.collection('transfer_logs').subscribe(
			'*',
			async (event: RecordSubscription<TransferLog>) => {
				if (!wallet) return;
				if (
					event.action === 'create' &&
					(event.record.wallet === wallet.id || event.record.targetWallet === wallet.id)
				) {
					userTransferLogs.unshift(event.record);
				}
			}
		);
		if (!wallet) return;
		pb.collection('wallets').subscribe(wallet.id, async (event: RecordSubscription<Wallet>) => {
			if (event.action === 'update') {
				wallet = event.record;
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
<PageCard bodyClass="card-body gap-3 p-3">
	<div class="px-1 text-xs tracking-wide opacity-60">Transactions</div>

	{#if userTransferLogs.length === 0}
		<EmptyState
			title="No transactions yet"
			description="Deposits, withdrawals, and transfers will appear here."
		/>
	{:else}
		<div class="mobile-only space-y-3">
			{#each userTransferLogs as transferLog (transferLog.id)}
				<div class="card bg-base-200 shadow-sm" animate:flip>
					<div class="card-body gap-2 p-4">
						<div class="flex items-start justify-between gap-3">
							<div>
								<div class="font-bold">{formatTransferType(transferLog, wallet)}</div>
								<div class="text-sm opacity-60">{formatTransferDate(transferLog.created)}</div>
							</div>
							<div
								class="text-right text-xl font-bold"
								class:text-success={isIncomingTransfer(transferLog, wallet)}
							>
								{formatTransferAmount(transferLog, wallet)}
							</div>
						</div>
						<div class="truncate font-mono text-xs opacity-50">{transferLog.id}</div>
					</div>
				</div>
			{/each}
		</div>

		<ul class="desktop-only list rounded-box bg-base-100 shadow-md">
			{#each userTransferLogs as transferLog (transferLog.id)}
				<li animate:flip class="list-row w-full items-center hover:bg-base-content/10">
					<div class="w-28">{formatTransferDate(transferLog.created)}</div>
					<div>
						<div>{formatTransferType(transferLog, wallet)}</div>
						<div class="font-mono text-xs opacity-50">{transferLog.id}</div>
					</div>
					<div
						class="w-auto text-left text-2xl"
						class:text-success={isIncomingTransfer(transferLog, wallet)}
					>
						{formatTransferAmount(transferLog, wallet)}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</PageCard>
