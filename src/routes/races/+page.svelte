<script lang="ts">
	import { getF1Schedule } from '$lib/remote/races.remote';
	import { titleCase } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';

	const query = getF1Schedule();

	const formatLocation = (location: string) => {
		return titleCase(location.replaceAll('-', ' '));
	};

	const formatRaceName = (raceName: string) => {
		raceName = raceName.substring(10); //remove Formula 1;
		raceName = raceName.replace(new Date().getFullYear().toString(), '');
		return titleCase(raceName);
	};
</script>

<div in:fade class="card h-full w-full overflow-auto bg-base-100">
	<div class="card-body">
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
				<table class="table not-md:table-sm">
					<thead>
						<tr>
							<th>Race Name</th>
							<th>Location</th>
							<th>Date</th>
						</tr>
					</thead>
					<tbody>
						{#each query.current.sort((a, b) => Date.parse(a.sessions[0].date) - Date.parse(b.sessions[0].date)) as race, index (index)}
							<tr>
								<td>{formatRaceName(race.raceName)}</td>
								<td>{formatLocation(race.location)}</td>
								<td>{race.sessions[0].date}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		{/if}
	</div>
</div>
