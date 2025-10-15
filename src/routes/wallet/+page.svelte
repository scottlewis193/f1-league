<script lang="ts">
	import {
		wallet,
		connectWallet,
		disconnectWallet,
		restoreSession
	} from '$lib/stores/wallet.svelte';
	import { onMount } from 'svelte';

	onMount(async () => {
		await restoreSession();
	});
</script>

<p>{wallet.publicKey}</p>
<div class="card h-full w-full overflow-auto bg-base-100">
	<div class="card-body flex flex-col items-center justify-center">
		{#if !wallet.connected}
			<button class="btn btn-primary" onclick={connectWallet}> Connect Solflare Wallet </button>
		{:else}
			<button class="btn btn-primary" onclick={disconnectWallet}> Disconnect </button>
		{/if}
	</div>
</div>
