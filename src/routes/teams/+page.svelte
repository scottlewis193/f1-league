<script lang="ts">
	import { getTeams } from '$lib/remote/teams.remote.js';
	import { fade } from 'svelte/transition';
	const query = getTeams();
</script>

<div in:fade class="card h-full w-full overflow-auto bg-base-100">
	<div class="card-body">
		{#if query.error}
			<p>{query.error}</p>
		{:else if query.loading}
			<div class="flex h-full w-full items-center justify-center">
				<span class="loading loading-md loading-spinner"></span>
			</div>
		{:else if query.ready}
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
	</div>
</div>
