<script lang="ts">
	import { getNews } from '$lib/remote/dashboard.remote';
	import { getNextRace } from '$lib/remote/races.remote';

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
<h1 class="text-3xl font-bold">News</h1>
<div class="card overflow-auto bg-base-100">
	<div class="card-body">
		{#if newsQuery.error}
			<p>Error fetching news</p>
		{:else if newsQuery.loading}
			<p>Loading news...</p>
		{:else}
			<p>Coming Soon</p>
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
