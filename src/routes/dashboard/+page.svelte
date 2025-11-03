<script lang="ts">
	import { getNextRace } from '$lib/remote/races.remote';
	import { onMount } from 'svelte';

	const nextRaceQuery = getNextRace();

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

	function fetchNews() {
		const RSS_URL = `http://feeds.feedburner.com/totalf1-recent`;

		fetch(RSS_URL, { mode: 'cors', headers: { 'Access-Control-Allow-Origin': '*' } })
			.then((response) => response.text())
			.then((str) => new window.DOMParser().parseFromString(str, 'text/xml'))
			.then((data) => console.log(data));
	}

	$effect(() => {
		if (nextRaceQuery.current) {
			initCountdown();
			fetchNews();
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
<div class="card bg-base-100">
	<div class="card-body"></div>
</div>
