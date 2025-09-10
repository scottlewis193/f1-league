<script lang="ts">
	import { onMount } from 'svelte';

	const { name, options }: { name: string; options: string[] } = $props();

	let selectedOption = $state(options[0]);

	onMount(() => {
		selectedOption = localStorage.getItem(name) || options[0];
	});

	const setOption = (_option: string) => {
		selectedOption = _option;
	};
</script>

<div class="dropdown">
	<div tabindex="0" role="button" class="btn w-52">
		{selectedOption}
		<svg
			width="12px"
			height="12px"
			class="inline-block h-2 w-2 fill-current opacity-60"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 2048 2048"
		>
			<path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
		</svg>
	</div>
	<ul
		id="theme-dropdown"
		tabindex="0"
		class="dropdown-content z-1 h-52 w-52 overflow-y-auto rounded-box bg-base-300 p-2 shadow-2xl"
	>
		{#each options as option}
			<li>
				<input
					type="radio"
					name="theme-dropdown"
					class=" btn w-full justify-start btn-ghost"
					aria-label={option}
					value={option}
					onchange={(e) => setOption(e.currentTarget.value)}
				/>
			</li>
		{/each}
	</ul>
</div>
