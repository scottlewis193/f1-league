<script lang="ts">
	import { getPlayers } from '$lib/remote/players.remote';
	import { getRaces } from '$lib/remote/races.remote';
	import { getPredictions } from '$lib/remote/predictions.remote';
	import { getPlayerStats } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import PocketBase from 'pocketbase';
	import { PUBLIC_PB_URL } from '$env/static/public';
	import { onMount } from 'svelte';
	const query = getPlayers();
	const pb = new PocketBase(PUBLIC_PB_URL);

	onMount(() => {
		pb.authStore.loadFromCookie(document.cookie);
	});
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
						<th>Pos</th>
						<th>Player</th>
						<th>Place</th>
						<th>Exact</th>
						<th>Points</th>
					</tr>
				</thead>
				<tbody>
					{#each query.current as player, index}
						<tr>
							<td>{index + 1}</td>
							<td>{player.name}</td>
							<td>{player.place}</td>
							<td>{player.exact}</td>
							<td>{player.points}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
