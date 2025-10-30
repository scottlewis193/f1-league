<script lang="ts">
	import { tick } from 'svelte';

	let {
		children,
		toggleOnce = false,
		relative = true,
		activeOnMount = false
	}: {
		children?: any;
		toggleOnce?: boolean;
		relative?: boolean;
		activeOnMount?: boolean;
	} = $props();

	let active = $state(activeOnMount);

	async function click() {
		if (toggleOnce) {
			active = !active;
			return;
		}

		active = false;
		await tick();
		active = true;
	}
</script>

<div onclick={click} class:relative class="w-fit">
	<!-- <button class="btn">Test</button> -->
	{#if active}
		<div class="confetti">
			{@render children?.()}
		</div>
	{/if}
</div>

<style>
	.relative .confetti {
		position: absolute;
		top: 50%;
		left: 50%;
	}

	.confetti {
		pointer-events: none;
	}
</style>
