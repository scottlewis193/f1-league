<script lang="ts">
	import { getF1Schedule } from '$lib/remote/races.remote';
	import { fade } from 'svelte/transition';

	const query = getF1Schedule();
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
			<table class="table">
				<thead>
					<tr>
						<th>Race Name</th>
						<th>Location</th>
						<th>Date</th>
					</tr>
				</thead>
				<tbody>
					{#each query.current.sort((a, b) => Date.parse(a.sessions[0].date) - Date.parse(b.sessions[0].date)) as race, index}
						<tr>
							<td>{race.raceName}</td>
							<td>{race.location}</td>
							<td>{race.sessions[0].date}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
