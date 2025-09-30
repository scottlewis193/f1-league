<script lang="ts">
	const {
		drivers,
		driver = $bindable(),
		id
	}: {
		drivers: string[];
		driver: { value: string; lastChanged: boolean; place: number; exact: number };
		id: string;
	} = $props();

	let userPopover: HTMLElement;

	const setDriver = (_driver: string) => {
		document.startViewTransition(() => {
			driver.value = _driver;
			driver.lastChanged = true;
			userPopover.hidePopover();
		});
	};
</script>

<div class="flex gap-2">
	<!-- <div class="flex w-7 items-center justify-center text-center">{id}</div> -->
	<button
		type="button"
		tabindex="0"
		class="btn grid w-52 grid-flow-col grid-cols-[0.5rem_1fr_0.5rem]"
		popovertarget={id}
		style="anchor-name:--anchor-{id}"
	>
		<div class="h-2 w-2"></div>
		<div class="">{driver.value}</div>
		<svg
			width="12px"
			height="12px"
			class="h-2 w-2 fill-current opacity-60"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 2048 2048"
		>
			<path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
		</svg>
	</button>
</div>
<ul
	bind:this={userPopover}
	class="dropdown-content dropdown h-52 w-52 overflow-y-auto rounded-box bg-base-300 p-2 shadow-2xl"
	popover
	{id}
	style="position-anchor:--anchor-{id}; bottom:anchor(top); position:absolute;"
>
	{#each drivers as driver}
		<li>
			<input
				type="radio"
				class=" btn w-full justify-start btn-ghost"
				aria-label={driver}
				value={driver}
				onchange={(e) => setDriver(e.currentTarget.value)}
			/>
		</li>
	{/each}
</ul>

<input type="hidden" name={'driver' + id} value={driver.value} />

<!--  -->

<!-- <div class="dropdown dropdown-top">
	<div tabindex="0" role="button" class="btn m-1">
		{_driver}
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
		bind:this={userPopover}
		{id}
		tabindex="0"
		class="dropdown-content z-1 h-52 w-52 overflow-y-auto rounded-box bg-base-300 p-2 shadow-2xl"
	>
		{#each drivers as driver}
			<li>
				<input
					type="radio"
					name="theme-dropdown"
					class=" btn w-full justify-start btn-ghost"
					aria-label={driver}
					value={driver}
					onchange={(e) => setDriver(e.currentTarget.value)}
				/>
			</li>
		{/each}
	</ul>
</div> -->

<style>
	@position-try --top {
		inset: auto;
		top: anchor(bottom);
		left: anchor(left);
	}
</style>
