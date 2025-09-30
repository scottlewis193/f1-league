<script lang="ts">
	import { getPlayers } from '$lib/remote/players.remote';
	import { titleCase } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import PocketBase from 'pocketbase';
	import { PUBLIC_PB_URL } from '$env/static/public';
	import { onMount } from 'svelte';
	import type { Player } from '$lib/types';
	const query = getPlayers();
	const pb = new PocketBase(PUBLIC_PB_URL);

	let historyDialog: HTMLDialogElement;

	let historyPlayer: Player | null = $state(null);
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
						<th>Player</th>
						<th>Pl</th>
						<th>Ex</th>
						<th>Pts</th>
						<th>History</th>
					</tr>
				</thead>
				<tbody>
					{#each query.current as player, index}
						<tr>
							<td class="font-bold">{player.name}</td>
							<td>{player.place}</td>
							<td>{player.exact}</td>
							<td>{player.points}</td>
							<td
								><button
									class="btn btn-sm"
									onclick={() => {
										historyPlayer = player;
										historyDialog.showModal();
									}}>View</button
								></td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>

<dialog bind:this={historyDialog} id="history-dialog" class="modal overflow-hidden">
	<div class="modal-box overflow-hidden">
		<div class="max-h-[calc(100vh-6rem)] overflow-auto pb-16">
			{#if historyPlayer}
				{#each historyPlayer.historyEntries as entry}
					<div class="flex flex-col gap-2">
						<h3 class="mt-2 text-center text-lg">{titleCase(entry.location)}</h3>
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Result</th>
									<th>Predict</th>
									<th>Pl</th>
									<th>Ex</th>
									<th>Pts</th>
								</tr>
							</thead>
							<tbody>
								{#each entry.results as result, index}
									<tr>
										<td>{result}</td>
										<td>{entry.predictions[index]}</td>

										<td>{entry.place[index]}</td>
										<td>{entry.exact[index]}</td>
										<td>{entry.points[index]}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/each}
			{/if}
		</div>
		<div class="absolute bottom-4 left-4 flex w-[calc(100%-2rem)] justify-center gap-6">
			<button class="btn w-full btn-secondary" onclick={() => historyDialog.close()}>Close</button>
		</div>
	</div>
</dialog>
