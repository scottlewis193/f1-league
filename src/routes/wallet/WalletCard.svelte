<script lang="ts">
	import type { Wallet } from '$lib/types';
	import { fade } from 'svelte/transition';

	let {
		wallet,
		withdraw,
		deposit
	}: { wallet: Wallet | undefined; withdraw: () => void; deposit: () => void } = $props();
</script>

<div in:fade class="stats h-42 w-full bg-primary shadow">
	<div class="stat text-primary-content">
		<div class="stat-title text-primary-content">Account Balance</div>
		<div class="stat-value">{wallet?.balance.toFixed(2) || 0} GBP</div>
		<div class="stat-actions">
			<button class="btn btn-xs" onclick={withdraw}>Withdrawal</button>
			<button class="btn btn-xs" onclick={deposit}>Deposit</button>
			<span class="absolute right-4 text-sm">
				{wallet?.id}
			</span>
		</div>
	</div>
</div>
