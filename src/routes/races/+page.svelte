<script lang="ts">
	import { getF1Schedule } from '$lib/remote/races.remote';
	import { titleCase } from '$lib/utils';
	import { fade } from 'svelte/transition';

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
			<p>{query.error}</p>
		{:else if query.loading}
			<div class="flex h-full w-full items-center justify-center">
				<span class="loading loading-md loading-spinner"></span>
			</div>
		{:else if query.ready}
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
	</div>
</div>
