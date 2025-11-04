<script lang="ts">
	import { getNews } from '$lib/remote/dashboard.remote';
	import { getNextRace } from '$lib/remote/races.remote';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';

	const nextRaceQuery = getNextRace();
	const newsQuery = getNews();

	function initCountdown() {
		if (!nextRaceQuery.current) return;
		let nextRaceYear = nextRaceQuery.current?.year;
		let nextRaceDate = Date.parse(
			nextRaceQuery.current?.sessions?.[0]?.date +
				' ' +
				nextRaceYear +
				' ' +
				nextRaceQuery.current?.sessions?.[0]?.time
		);

		let timeLeft = nextRaceDate - Date.now();
		if (timeLeft < 0) {
			timeLeft = 0;
		}

		const interval = setInterval(() => {
			const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
			const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
			const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
			const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);

			const daysEl = document.querySelector<HTMLSpanElement>('#days');
			if (!daysEl) return;
			daysEl.style.setProperty('--value', days.toString());

			const hoursEl = document.querySelector<HTMLSpanElement>('#hours');
			if (!hoursEl) return;
			hoursEl.style.setProperty('--value', hours.toString());

			const minutesEl = document.querySelector<HTMLSpanElement>('#minutes');
			if (!minutesEl) return;
			minutesEl.style.setProperty('--value', minutes.toString());

			const secondsEl = document.querySelector<HTMLSpanElement>('#seconds');
			if (!secondsEl) return;
			secondsEl.style.setProperty('--value', seconds.toString());

			if (timeLeft <= 0) {
				clearInterval(interval);
			}

			timeLeft -= 1000;
		}, 1000);
	}

	$effect(() => {
		if (nextRaceQuery.current && newsQuery.current) {
			initCountdown();
		}
	});
</script>

<h1 class="text-3xl font-bold">Countdown</h1>
{#if nextRaceQuery.loading}
	<div class="card bg-base-100">
		<div class="card-body items-center justify-center">
			<div class="grid auto-cols-max grid-flow-col gap-5">
				{#each Array(4) as _, i (i)}
					<div class="flex flex-col items-center gap-2">
						<Skeleton type="text" width="5rem" height="3rem" />
						<Skeleton type="text" width="3rem" />
					</div>
				{/each}
			</div>
		</div>
	</div>
{:else if nextRaceQuery.error}
	<div class="card bg-base-100">
		<div class="card-body">
			<ErrorState
				title="Countdown unavailable"
				message="Unable to load next race information"
				error={nextRaceQuery.error}
				onRetry={() => nextRaceQuery.refresh?.()}
			/>
		</div>
	</div>
{:else}
	<div class="card bg-base-100">
		<div class="card-body items-center justify-center">
			<div class="grid auto-cols-max grid-flow-col gap-5 text-center">
				<div class="flex flex-col">
					<span class="countdown font-mono text-5xl">
						<span id="days" style="--value:0;" aria-live="polite" aria-label="0">0</span>
					</span>
					days
				</div>
				<div class="flex flex-col">
					<span class="countdown font-mono text-5xl">
						<span id="hours" style="--value:0;" aria-live="polite" aria-label="0">0</span>
					</span>
					hours
				</div>
				<div class="flex flex-col">
					<span class="countdown font-mono text-5xl">
						<span id="minutes" style="--value:0;" aria-live="polite" aria-label="0">0</span>
					</span>
					min
				</div>
				<div class="flex flex-col">
					<span class="countdown font-mono text-5xl">
						<span id="seconds" style="--value:0;" aria-live="polite" aria-label="0">0</span>
					</span>
					sec
				</div>
			</div>
		</div>
	</div>
{/if}

<h1 class="text-3xl font-bold">News</h1>
<div class="card overflow-auto bg-base-100">
	<div class="card-body">
		{#if newsQuery.error}
			<ErrorState
				title="News unavailable"
				message="Unable to load latest F1 news"
				error={newsQuery.error}
				onRetry={() => newsQuery.refresh?.()}
				showRetry={false}
			/>
		{:else if newsQuery.loading}
			<div class="flex flex-col gap-4">
				{#each Array(3) as _, i (i)}
					<div class="flex flex-col gap-2">
						<Skeleton type="text" width="60%" />
						<Skeleton type="text" rows={2} />
					</div>
				{/each}
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center gap-4 py-8 text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-16 w-16 text-base-content/20"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
					/>
				</svg>
				<p class="text-base-content/50">News coming soon</p>
			</div>
			<!-- <table class="table">
				<tbody>
					{#each newsQuery.current?.items as item, index (index)}
						<tr>
							<td>{item.title}</td>
							<td>{item.description}</td>
						</tr>
					{/each}
				</tbody>
			</table> -->
		{/if}
	</div>
</div>
