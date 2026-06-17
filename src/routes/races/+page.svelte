<script lang="ts">
	import { getF1Schedule } from '$lib/remote/races.remote';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';
	import PageCard from '$lib/components/PageCard.svelte';
	import { formatRaceLocation, formatRaceName, sortRacesByFirstSession } from '$lib/domain/races';

	const query = getF1Schedule();
</script>

<PageCard>
		{#if query.error}
			<ErrorState
				title="Failed to load race schedule"
				message="We couldn't fetch the F1 race schedule. Please check your connection and try again."
				error={query.error}
				onRetry={() => query.refresh?.()}
			/>
		{:else if query.loading}
			<table class="table not-md:table-sm">
				<thead>
					<tr>
						<th>Race Name</th>
						<th>Location</th>
						<th>Date</th>
					</tr>
				</thead>
				<tbody>
					{#each Array(10) as _, i (i)}
						<tr>
							<td><Skeleton type="text" width="70%" /></td>
							<td><Skeleton type="text" width="60%" /></td>
							<td><Skeleton type="text" width="50%" /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else if query.ready}
			{#if query.current.length === 0}
				<EmptyState
					title="No races scheduled"
					description="The race schedule hasn't been published yet. Check back later!"
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
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
					{/snippet}
				</EmptyState>
			{:else}
				<div class="mobile-only space-y-3">
					{#each sortRacesByFirstSession(query.current) as race (race.id)}
						<div class="card bg-base-200 shadow-sm">
							<div class="card-body gap-2 p-4">
								<div class="flex items-start justify-between gap-3">
									<div>
										<div class="font-bold">{formatRaceName(race.raceName)}</div>
										<div class="text-sm opacity-70">{formatRaceLocation(race.location)}</div>
									</div>
									<div class="badge badge-outline whitespace-nowrap">Round {race.raceNo}</div>
								</div>
								<div class="text-sm">{race.sessions[0].date}</div>
							</div>
						</div>
					{/each}
				</div>

				<table class="desktop-only table">
					<thead>
						<tr>
							<th>Race Name</th>
							<th>Location</th>
							<th>Date</th>
						</tr>
					</thead>
					<tbody>
						{#each sortRacesByFirstSession(query.current) as race (race.id)}
							<tr>
								<td>{formatRaceName(race.raceName)}</td>
								<td>{formatRaceLocation(race.location)}</td>
								<td>{race.sessions[0].date}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		{/if}
</PageCard>
