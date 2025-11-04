<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title = 'Something went wrong',
		message = 'An unexpected error occurred. Please try again.',
		error,
		showRetry = true,
		onRetry = () => {},
		icon,
		class: className = ''
	}: {
		title?: string;
		message?: string;
		error?: string | Error | null;
		showRetry?: boolean;
		onRetry?: () => void;
		icon?: Snippet;
		class?: string;
	} = $props();

	const errorMessage = $derived(
		error ? (typeof error === 'string' ? error : error.message) : message
	);
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center {className}">
	{#if icon}
		<div class="text-error">
			{@render icon()}
		</div>
	{:else}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-24 w-24 text-error/60"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1.5"
				d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
			/>
		</svg>
	{/if}

	<div class="flex flex-col gap-2">
		<h3 class="text-lg font-semibold text-error">{title}</h3>
		<p class="text-sm text-base-content/70">{errorMessage}</p>
	</div>

	{#if showRetry}
		<button class="btn btn-error btn-sm" onclick={onRetry}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
				/>
			</svg>
			Try Again
		</button>
	{/if}
</div>
