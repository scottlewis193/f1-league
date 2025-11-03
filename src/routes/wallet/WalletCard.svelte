<script lang="ts">
	import { getToastManagerContext } from '$lib/stores/toastmanager.svelte';
	import { wallet } from '$lib/stores/wallet.svelte';
	import { copyToClipboard, shortAddress, usdToGbp } from '$lib/utils';
	import { fade } from 'svelte/transition';

	const toastManager = getToastManagerContext();

	function fund() {
		const url = `https://www.coinbase.com/advanced-trade/usdc-gbp`;
		window.open(url, '_blank');
	}

	function disconnect() {
		if (!wallet.adapter) return;
		wallet.adapter.disconnect();
		toastManager.addToast('Wallet disconnected', 'info');
		window.location.reload();
	}

	function copyAddress() {
		copyToClipboard(wallet?.publicKey?.toBase58() || '');
		toastManager.addToast('Wallet address copied', 'info');
	}
</script>

<div in:fade class="card w-full bg-primary">
	<div class="card-body text-primary-content">
		<div class="flex justify-between">
			<h2 class="card-title">Wallet</h2>
			<h4 class="card-title">
				{wallet.balanceUSDC} USDC ({(await usdToGbp(wallet.balanceUSDC)).toFixed(2)} GBP)
			</h4>
		</div>
		<p>{shortAddress(wallet.publicKey?.toBase58() || '')}</p>
		<div class="flex w-full">
			<div class="card-actions flex w-full justify-start">
				<button class="btn btn-sm btn-neutral" onclick={() => disconnect()}>Disconnect</button>
				<button onclick={fund} class="btn btn-sm btn-neutral">Fund</button>
			</div>
			<div class="card-actions flex w-full justify-end">
				<button
					class="btn btn-sm btn-neutral"
					onclick={() => {
						copyAddress();
					}}>Copy Address</button
				>
			</div>
		</div>
	</div>
</div>
