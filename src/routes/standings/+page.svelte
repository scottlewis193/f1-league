<script lang="ts">
	import { getDrivers } from '$lib/remote/drivers.remote';
	import { getTeams } from '$lib/remote/teams.remote.js';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';
	import PageCard from '$lib/components/PageCard.svelte';

	let selectedTab: string = $state('drivers') as 'teams' | 'drivers';

	const teamsQuery = getTeams();
	const driversQuery = getDrivers();
</script>

<div class="card bg-base-100">
	<div class="tabs-border tabs">
		<input
			type="radio"
			name="selector"
			class="tab w-1/2"
			aria-label="Drivers"
			checked={selectedTab === 'drivers'}
			onchange={() => (selectedTab = 'drivers')}
		/>
		<input
			type="radio"
			name="selector"
			class="tab w-1/2"
			aria-label="Teams"
			checked={selectedTab === 'teams'}
			onchange={() => (selectedTab = 'teams')}
		/>
	</div>
</div>
{#if selectedTab === 'drivers'}
	<PageCard>
		{#if driversQuery.error}
			<ErrorState
				title="Failed to load drivers"
				message="We couldn't load the driver standings. Please check your connection and try again."
				error={driversQuery.error}
				onRetry={() => driversQuery.refresh?.()}
			/>
		{:else if driversQuery.ready}
			{#if driversQuery.current.length === 0}
				<EmptyState
					title="No driver standings available"
					description="Driver standings haven't been published yet. Check back after the first race!"
				>
					{#snippet icon()}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-24 w-24"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
					{/snippet}
				</EmptyState>
			{:else}
				<div class="mobile-only space-y-3">
					{#each driversQuery.current as driver (driver.id)}
						<div class="card bg-base-200 shadow-sm">
							<div class="card-body flex-row items-center justify-between p-4">
								<div class="flex items-center gap-3">
									<div class="badge badge-lg">{driver.position}</div>
									<div>
										<div class="font-bold">{driver.name}</div>
										<div class="text-sm opacity-70">{driver.team}</div>
									</div>
								</div>
								<div class="text-right">
									<div class="text-xl font-bold">{driver.points}</div>
									<div class="text-xs opacity-60">pts</div>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<table class="desktop-only table-pin-rows table">
					<thead>
						<tr class="h-15">
							<th>Pos</th>
							<th>Driver</th>
							<th>Team</th>
							<th>Points</th>
						</tr>
					</thead>
					<tbody>
						{#each driversQuery.current as driver (driver.id)}
							<tr>
								<td>{driver.position}</td>
								<td>{driver.name}</td>
								<td>{driver.team}</td>
								<td>{driver.points}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		{/if}
	</PageCard>
{/if}

{#if selectedTab === 'teams'}
	<PageCard>
		{#if teamsQuery.error}
			<ErrorState
				title="Failed to load teams"
				message="We couldn't load the constructor standings. Please check your connection and try again."
				error={teamsQuery.error}
				onRetry={() => teamsQuery.refresh?.()}
			/>
		{:else if teamsQuery.ready}
			{#if teamsQuery.current.length === 0}
				<EmptyState
					title="No team standings available"
					description="Constructor standings haven't been published yet. Check back after the first race!"
				>
					{#snippet icon()}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-24 w-24"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
					{/snippet}
				</EmptyState>
			{:else}
				<div class="mobile-only space-y-3">
					{#each teamsQuery.current as team (team.id)}
						<div class="card bg-base-200 shadow-sm">
							<div class="card-body flex-row items-center justify-between p-4">
								<div class="flex items-center gap-3">
									<div class="badge badge-lg">{team.position}</div>
									<div class="font-bold">{team.name}</div>
								</div>
								<div class="text-right">
									<div class="text-xl font-bold">{team.points}</div>
									<div class="text-xs opacity-60">pts</div>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<table class="desktop-only table">
					<thead>
						<tr>
							<th>Pos</th>
							<th>Team</th>
							<th>Points</th>
						</tr>
					</thead>
					<tbody>
						{#each teamsQuery.current as team (team.id)}
							<tr>
								<td>{team.position}</td>
								<td>{team.name}</td>
								<td>{team.points}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		{/if}
	</PageCard>
{/if}
