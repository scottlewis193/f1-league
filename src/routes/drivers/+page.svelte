<script lang="ts">
	import { getDrivers } from '$lib/remote/drivers.remote';
	import { fade } from 'svelte/transition';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';

	const query = getDrivers();
</script>

<div in:fade class="card h-full w-full overflow-auto bg-base-100">
	<div class="card-body">
		{#if query.error}
			<ErrorState
				title="Failed to load drivers"
				message="We couldn't load the driver standings. Please check your connection and try again."
				error={query.error}
				onRetry={() => query.refresh?.()}
			/>
		{:else if query.loading}
			<table class="table not-md:table-sm">
				<thead class="sticky top-0">
					<tr>
						<th>Pos</th>
						<th>Driver</th>
						<th>Team</th>
						<th>Points</th>
					</tr>
				</thead>
				<tbody>
					{#each Array(10) as _, i (i)}
						<tr>
							<td><Skeleton type="text" width="2rem" /></td>
							<td><Skeleton type="text" width="70%" /></td>
							<td><Skeleton type="text" width="60%" /></td>
							<td><Skeleton type="text" width="3rem" /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else if query.ready}
			{#if query.current.length === 0}
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
				<table class="table not-md:table-sm">
					<thead class="sticky top-0">
						<tr>
							<th>Pos</th>
							<th>Driver</th>
							<th>Team</th>
							<th>Points</th>
						</tr>
					</thead>
					<tbody>
						{#each query.current as driver (driver.id)}
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
	</div>
</div>
