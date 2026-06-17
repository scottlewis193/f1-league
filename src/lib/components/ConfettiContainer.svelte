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

	//svelte-ignore state_referenced_locally
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

<button type="button" onclick={click} class:relative class="w-fit border-0 bg-transparent p-0">
	{#if active}
		<div class="confetti">
			{@render children?.()}
		</div>
	{/if}
</button>

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
