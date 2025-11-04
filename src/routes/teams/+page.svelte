<script lang="ts">
	import { getTeams } from '$lib/remote/teams.remote.js';
	import { fade } from 'svelte/transition';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';

	const query = getTeams();
</script>

<div in:fade class="card h-full w-full overflow-auto bg-base-100">
	<div class="card-body">
		{#if query.error}
			<ErrorState
				title="Failed to load teams"
				message="We couldn't load the constructor standings. Please check your connection and try again."
				error={query.error}
				onRetry={() => query.refresh?.()}
			/>
		{:else if query.loading}
			<table class="table not-md:table-sm">
				<thead>
					<tr>
						<th>Pos</th>
						<th>Team</th>
						<th>Points</th>
					</tr>
				</thead>
				<tbody>
					{#each Array(10) as _, i (i)}
						<tr>
							<td><Skeleton type="text" width="2rem" /></td>
							<td><Skeleton type="text" width="70%" /></td>
							<td><Skeleton type="text" width="3rem" /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else if query.ready}
			{#if query.current.length === 0}
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
				<table class="table not-md:table-sm">
					<thead>
						<tr>
							<th>Pos</th>
							<th>Team</th>
							<th>Points</th>
						</tr>
					</thead>
					<tbody>
						{#each query.current as team (team.id)}
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
	</div>
</div>
