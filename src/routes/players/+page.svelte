<script lang="ts">
	import { getPlayersWithStats } from '$lib/remote/players.remote';
	import { titleCase } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import PocketBase from 'pocketbase';
	import { PUBLIC_PB_URL } from '$env/static/public';
	import { onMount } from 'svelte';
	import type { Player } from '$lib/types';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';

	const query = getPlayersWithStats();
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
			<ErrorState
				title="Failed to load players"
				message="We couldn't load the player data. Please check your connection and try again."
				error={query.error}
				onRetry={() => query.refresh?.()}
			/>
		{:else if query.loading}
			<table class="table not-md:table-sm">
				<thead>
					<tr>
						<th>Player</th>
						<th>Pl</th>
						<th>Ex</th>
						<th>Pts</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each Array(5) as _, i (i)}
						<tr>
							<td class="flex items-center gap-4">
								<Skeleton type="avatar" width="2.5rem" height="2.5rem" />
								<Skeleton type="text" width="8rem" />
							</td>
							<td><Skeleton type="text" width="2rem" /></td>
							<td><Skeleton type="text" width="2rem" /></td>
							<td><Skeleton type="text" width="3rem" /></td>
							<td><Skeleton type="button" width="4rem" height="2rem" /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else if query.ready}
			{#if query.current.length === 0}
				<EmptyState
					title="No players yet"
					description="Be the first to join the league and start predicting race results!"
					actionText="View Rules"
					onAction={() => (window.location.href = '/rules')}
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
							<th>Player</th>
							<th>Pl</th>
							<th>Ex</th>
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
											PUBLIC_PB_URL +
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
									{player.name}</td
								>
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
