<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title = 'No data available',
		description = '',
		icon,
		action,
		actionText = '',
		onAction = () => {}
	}: {
		title?: string;
		description?: string;
		icon?: Snippet;
		action?: Snippet;
		actionText?: string;
		onAction?: () => void;
	} = $props();
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
	{#if icon}
		<div class="text-base-content/30">
			{@render icon()}
		</div>
	{:else}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-24 w-24 text-base-content/20"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1.5"
				d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
			/>
		</svg>
	{/if}

	<div class="flex flex-col gap-2">
		<h3 class="text-lg font-semibold text-base-content/70">{title}</h3>
		{#if description}
			<p class="text-sm text-base-content/50">{description}</p>
		{/if}
	</div>

	{#if action}
		{@render action()}
	{:else if actionText}
		<button class="btn btn-primary btn-sm" onclick={onAction}>
			{actionText}
		</button>
	{/if}
</div>
