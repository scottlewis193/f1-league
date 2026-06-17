<script lang="ts">
	import { getPlayersWithStats } from '$lib/remote/players.remote';
	import { titleCase } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import type { Player } from '$lib/types';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';

	const query = getPlayersWithStats();

	let { data } = $props();
	let historyDialog: HTMLDialogElement;

	let historyPlayer: Player | null = $state(null);
	const pbUrl = $derived(data.pbUrl || '');
</script>

<div in:fade class="h-full w-full overflow-auto bg-base-100">
	<div class="p-4">
		{#if query.error}
			<ErrorState
				title="Failed to load players"
				message="We couldn't load the player data. Please check your connection and try again."
				error={query.error}
				onRetry={() => query.refresh?.()}
			/>
		{:else if query.ready}
			<!-- Mobile: Card layout -->
			<div class="mobile-only space-y-3">
				{#each query.current as player (player.id)}
					<div class="card bg-base-200 shadow-md">
						<div class="card-body p-4">
							<div class="flex items-center justify-between">
								<!-- Player Info -->
								<div class="flex items-center gap-3">
									{#if player.avatar}
										{@const avatarUrl =
											pbUrl +
											'/api/files/users/' +
											player.id +
											'/' +
											player.avatar +
											'?thumb=48x48'}
										<div
											style="background-image: url({avatarUrl}); background-size: cover;"
											class="flex size-10 items-center justify-center rounded-box text-neutral-content"
										></div>
									{:else}
										<div
											class="flex size-10 items-center justify-center rounded-box bg-neutral text-neutral-content"
										>
											<span>{player.name.substring(0, 1).toUpperCase()}</span>
										</div>
									{/if}
									<div>
										<div class="font-bold">{player.name}</div>
									</div>
								</div>
								<!-- Total Points (prominent) -->
								<div class="text-right">
									<div class="text-2xl font-bold">{player.points}</div>
									<div class="text-xs opacity-60">pts</div>
								</div>
							</div>
							<!-- Stats Grid -->
							<div class="divider my-1"></div>
							<div class="grid grid-cols-3 gap-2">
								<div class="text-center">
									<div class="text-lg font-bold">{player.place || '-'}</div>
									<div class="text-xs opacity-60">Placed</div>
								</div>
								<div class="text-center">
									<div class="text-lg font-bold">{player.exact || '-'}</div>
									<div class="text-xs opacity-60">Exact</div>
								</div>
								<div class="text-center">
									<div class="text-lg font-bold">{player.wildPrediction || '-'}</div>
									<div class="text-xs opacity-60">Wild</div>
								</div>
							</div>
							<!-- View History Button -->
							<div class="mt-2 card-actions justify-end">
								<button
									class="btn btn-outline btn-sm"
									onclick={() => {
										historyPlayer = player;
										historyDialog.showModal();
									}}
								>
									View History
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Desktop: Table layout -->
			<table class="desktop-only table w-full">
				<thead>
					<tr>
						<th>Player</th>
						<th>Pl</th>
						<th>Ex</th>
						<th>WP</th>
						<th>Pts</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each query.current as player (player.id)}
						<tr>
							<td class="flex items-center gap-4 font-bold"
								>{#if player.avatar}
									{@const avatarUrl =
										pbUrl + '/api/files/users/' + player.id + '/' + player.avatar + '?thumb=48x48'}
									<div
										style="background-image: url({avatarUrl}); background-size: cover;"
										class="flex size-10 items-center justify-center rounded-box text-neutral-content"
									></div>
								{:else}
									<div
										class="flex size-10 items-center justify-center rounded-box bg-neutral text-neutral-content"
									>
										<span>{player.name.substring(0, 1).toUpperCase()}</span>
									</div>
								{/if}
								{player.name}</td
							>
							<td>{player.place}</td>
							<td>{player.exact}</td>
							<td>{player.wildPrediction}</td>
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
				{#if historyPlayer.historyEntries.length === 0}
					<EmptyState
						title="No history yet"
						description="{historyPlayer.name} hasn't participated in any races yet."
					/>
				{:else}
					{#each historyPlayer.historyEntries as entry (entry.location)}
						<div class="flex flex-col gap-2">
							<h3 class="mt-2 text-center text-lg">{titleCase(entry.location)}</h3>
							<table class="table table-sm">
								<thead>
									<tr>
										<th>Predict</th>
										<th>Result</th>

										<th>Pl</th>
										<th>Ex</th>
										<th>Pts</th>
									</tr>
								</thead>
								<tbody>
									{#each entry.results as result, index (index)}
										<tr>
											<td>{entry.predictions[index]}</td>
											<td>{result}</td>

											<td>{entry.place[index]}</td>
											<td>{entry.exact[index]}</td>
											<td>{entry.points[index]}</td>
										</tr>
									{/each}
									{#if entry.wildPredictionPoints > 0}
										<tr>
											<td colspan="3" class="text-right font-bold">Wild Prediction:</td>
											<td class="font-bold">{entry.wildPredictionPoints}</td>
										</tr>
									{/if}
								</tbody>
							</table>
						</div>
					{/each}
				{/if}
			{/if}
		</div>
		<div class="absolute bottom-4 left-4 flex w-[calc(100%-2rem)] justify-center gap-6">
			<button class="btn w-full btn-secondary" onclick={() => historyDialog.close()}>Close</button>
		</div>
	</div>
</dialog>
