<script lang="ts">
	import { wallet, connect, disconnect } from '$lib/stores/wallet.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		console.log('Phantom available?', window.solana?.isPhantom);
	});
</script>

{#if wallet.connected}
	<p>Connected: {wallet.publicKey?.toBase58()}</p>
	<p>SOL Balance: {wallet.balance}</p>
	<button class="btn btn-primary" onclick={disconnect}>Disconnect</button>
{:else if typeof window !== 'undefined' && window.solana !== undefined && window.solana?.isPhantom}
	<button class="btn btn-primary" onclick={connect}>Connect Phantom Wallet</button>
{:else}
	<p>Please install Phantom Wallet.</p>
{/if}
