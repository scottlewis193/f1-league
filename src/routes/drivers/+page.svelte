<script lang="ts">
	import { getDrivers } from '$lib/remote/drivers.remote';
	import { fade } from 'svelte/transition';
	const query = getDrivers();
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
				<thead class="sticky top-0">
					<tr class="">
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
	</div>
</div>
