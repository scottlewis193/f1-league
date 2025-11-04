<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		loading = false,
		disabled = false,
		type = 'button',
		class: className = '',
		onclick = () => {},
		children
	}: {
		loading?: boolean;
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		onclick?: (event: MouseEvent) => void | Promise<void>;
		children?: Snippet;
	} = $props();

	let isProcessing = $state(false);

	async function handleClick(event: MouseEvent) {
		if (isProcessing || loading) return;

		isProcessing = true;
		try {
			await onclick(event);
		} finally {
			isProcessing = false;
		}
	}

	const isLoading = $derived(loading || isProcessing);
	const isDisabled = $derived(disabled || isLoading);
</script>

<button
	{type}
	class="btn {className}"
	disabled={isDisabled}
	onclick={handleClick}
>
	{#if isLoading}
		<span class="loading loading-spinner loading-sm"></span>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</button>
