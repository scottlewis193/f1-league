<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.png';
	// import '$lib/pwa.ts';
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import { page } from '$app/state';
	import PlayersIcon from '$lib/components/PlayersIcon.svelte';
	import DriversIcon from '$lib/components/DriversIcon.svelte';
	import TeamsIcon from '$lib/components/TeamsIcon.svelte';
	import RulesIcon from '$lib/components/RulesIcon.svelte';
	import ProfileIcon from '$lib/components/ProfileIcon.svelte';
	import SettingsIcon from '$lib/components/SettingsIcon.svelte';
	import LogOutIcon from '$lib/components/LogOutIcon.svelte';
	import SubmissionsIcon from '$lib/components/SubmissionsIcon.svelte';
	import RacesIcon from '$lib/components/RacesIcon.svelte';
	import { getNextRace } from '$lib/remote/races.remote';
	import { titleCase } from '$lib/utils';
	import { onMount } from 'svelte';
	import { subscribeToPush } from '$lib/subscribe';
	import { logout } from '$lib/remote/players.remote';
	import { Confetti } from 'svelte-confetti';
	import ConfettiContainer from '$lib/components/ConfettiContainer.svelte';
	let { children, data } = $props();
	const url = $derived(page.url.pathname);
	// svelte-ignore non_reactive_update
	let drawerToggle: HTMLInputElement;
	// svelte-ignore non_reactive_update
	let userPopover: HTMLElement;
	// svelte-ignore non_reactive_update
	let updateModal: HTMLDialogElement;

	const nextRaceQuery = getNextRace();

	// Set up SW registration
	const { needRefresh, updateServiceWorker } = useRegisterSW({
		immediate: true,
		onRegisteredSW(swUrl, r) {
			console.log('SW registered:', swUrl, r);
		},
		onNeedRefresh() {
			console.log('SW waiting to update...');
		},
		onOfflineReady() {
			console.log('App ready to work offline');
		}
	});

	let isDecember = new Date().getMonth() === 12;

	//client init
	onMount(async () => {
		await subscribeToPush();
		if ($needRefresh) {
			updateModal.showModal();
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

{#if url !== '/login' && url !== '/register'}
	{#if nextRaceQuery.ready}
		{@const nextRace = nextRaceQuery.current}
		<div class="drawer">
			<input bind:this={drawerToggle} id="my-drawer-3" type="checkbox" class="drawer-toggle" />
			<div class="drawer-content flex flex-col">
				<!-- Navbar -->
				<div class="navbar w-full justify-between bg-base-300 p-4">
					<div class="lg:hidden lg:min-w-[25%]">
						<label for="my-drawer-3" aria-label="open sidebar" class="btn btn-square btn-ghost">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								class="inline-block h-6 w-6 stroke-current"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 6h16M4 12h16M4 18h16"
								></path>
							</svg>
						</label>
					</div>
					<div class="mx-2 px-2 text-lg lg:min-w-[25%] lg:text-left">
						{url == '/predictions'
							? 'Predictions (' + titleCase(nextRaceQuery.current?.location) + ' GP)'
							: titleCase(url.replace('/', '') || 'Home')}
					</div>
					<div class="hidden lg:block">
						<ul class="menu menu-horizontal">
							<!-- Navbar menu content here -->
							<li><a href="/players">Players</a></li>
							<li><a href="/drivers">Drivers</a></li>
							<li><a href="/teams">Teams</a></li>
							<li><a href="/races">Races</a></li>
							<li><a href="/rules">Rules</a></li>
							<li><a href="/predictions">Predictions</a></li>
						</ul>
					</div>
					<div class="flex justify-end gap-4 lg:min-w-[25%]">
						<div class="hidden flex-col items-end justify-center text-end lg:block">
							<div class="text-xs">Next Race</div>
							<div class="text-xs font-bold">{titleCase(nextRace.location)}</div>
							<div class="text-xs">
								{nextRace.sessions[0].date.split(' ')[0] +
									' - ' +
									nextRace.sessions[nextRace.sessions.length - 1].date}
							</div>
						</div>
						<div class="avatar avatar-placeholder items-center">
							<button
								class="h-12 w-12 cursor-pointer rounded-full bg-neutral text-neutral-content"
								popovertarget="popover-1"
								style="anchor-name:--anchor-1"
							>
								<span>{data.user?.name.substring(0, 1).toUpperCase()}</span>
							</button>
						</div>
					</div>
				</div>
				<!-- Page content here -->
				<div class="flex h-full w-full flex-col items-center justify-center">
					<div
						class=" flex h-[calc(100svh-5rem)] min-h-[calc(100svh-5rem)] w-full max-w-2xl flex-col gap-4 p-4"
					>
						{@render children?.()}
					</div>
				</div>
			</div>
			<!-- Side Drawer -->
			<div class="drawer-side">
				<label for="my-drawer-3" aria-label="close sidebar" class="drawer-overlay"></label>

				<ul class="menu min-h-full w-80 menu-lg bg-base-200">
					<p class="flex h-16 items-center ps-4 text-xl font-bold">F1 League</p>
					<!-- Sidebar content here -->
					<li>
						<a
							class="flex h-16 items-center"
							href="/players"
							onclick={() => (drawerToggle.checked = false)}><PlayersIcon /> Players</a
						>
					</li>
					<li>
						<a
							class="flex h-16 items-center"
							href="/drivers"
							onclick={() => (drawerToggle.checked = false)}><DriversIcon /> Drivers</a
						>
					</li>

					<li>
						<a
							class="flex h-16 items-center"
							href="/teams"
							onclick={() => (drawerToggle.checked = false)}><TeamsIcon /> Teams</a
						>
					</li>
					<li>
						<a
							class="flex h-16 items-center"
							href="/races"
							onclick={() => (drawerToggle.checked = false)}><RacesIcon /> Races</a
						>
					</li>
					<li>
						<a
							class="flex h-16 items-center"
							href="/rules"
							onclick={() => (drawerToggle.checked = false)}><RulesIcon /> Rules</a
						>
					</li>
					<li>
						<a
							class="flex h-16 items-center"
							href="/predictions"
							onclick={() => (drawerToggle.checked = false)}><SubmissionsIcon /> Predictions</a
						>
					</li>
				</ul>
				<div class="stats self-end shadow">
					<div class="stat">
						<div class="stat-title">Next Race</div>
						<div class="stat-value">{titleCase(nextRace.location)}</div>
						<div class="stat-desc">
							{nextRace.sessions[0].date.split(' ')[0] +
								' - ' +
								nextRace.sessions[nextRace.sessions.length - 1].date}
						</div>
					</div>
				</div>
			</div>
		</div>
		<!-- Popover -->
		<ul
			class="menu dropdown dropdown-end w-52 menu-lg rounded-box bg-base-100 shadow-sm"
			popover
			id="popover-1"
			style="position-anchor:--anchor-1"
			bind:this={userPopover}
		>
			<li>
				<a href="/profile" class="flex h-16 items-center" onclick={() => userPopover.hidePopover()}
					><ProfileIcon /> Profile</a
				>
			</li>
			<li>
				<a href="/settings" class="flex h-16 items-center" onclick={() => userPopover.hidePopover()}
					><SettingsIcon /> Settings</a
				>
			</li>
			<li>
				<form {...logout} class="flex h-16 items-center" onclick={() => userPopover.hidePopover()}>
					<LogOutIcon /> <button type="submit">Log Out</button>
				</form>
			</li>
		</ul>
	{/if}

	<!-- Open the modal using ID.showModal() method -->

	<dialog
		bind:this={updateModal}
		id="updateModal"
		class="modal modal-bottom w-[100vw] sm:modal-middle"
	>
		<div class="modal-box">
			<h3 class="text-lg font-bold">New Update Available!</h3>
			<p class="py-4">Changelog</p>
			<div class="modal-action">
				<button
					class="btn btn-sm btn-primary"
					onclick={() => {
						console.log('update');
						updateServiceWorker(true).then(() => {
							console.log('updateServiceWorker(true) resolved');
						});
					}}>Reload</button
				>
			</div>
		</div>
	</dialog>
{:else}
	{@render children?.()}
{/if}

<!-- Snow confetti effect for christmas -->
{#if isDecember}
	<ConfettiContainer toggleOnce relative={false} activeOnMount>
		<div class="fixed top-[-50px] left-0 flex h-[100vh] w-[100vw] justify-center overflow-hidden">
			<Confetti
				colorArray={['#ffffff']}
				x={[-5, 5]}
				y={[0, 0.1]}
				delay={[500, 2000]}
				infinite
				duration={7500}
				amount={200}
				fallDistance="100vh"
			/>
		</div>
	</ConfettiContainer>
{/if}
