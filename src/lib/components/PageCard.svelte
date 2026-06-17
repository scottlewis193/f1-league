<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		class: className = '',
		bodyClass = 'card-body',
		scroll = true
	}: {
		children?: Snippet;
		class?: string;
		bodyClass?: string;
		scroll?: boolean;
	} = $props();
</script>

<div class={["card h-full w-full bg-base-100", scroll && 'overflow-auto', className].filter(Boolean).join(' ')}>
	<div class={bodyClass}>
		{@render children?.()}
	</div>
</div>
