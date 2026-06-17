<script lang="ts">
	import { getNextRace } from '$lib/remote/races.remote';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';
	import { onDestroy } from 'svelte';
	import DonateDialog from './DonateDialog.svelte';
	import { getSeasonWallet } from '$lib/remote/wallets.remote';
	import { fade } from 'svelte/transition';
	import { formatSessionToUKTime, parseLondon } from '$lib/utils';
	import { WAGER_AMOUNT } from '$lib/config';

	const nextRaceQuery = getNextRace();
	const seasonWallet = getSeasonWallet();
	let interval: ReturnType<typeof setInterval>;
	let countdown = $state({ days: 0, hours: 0, minutes: 0, seconds: 0 });

	let donateDialog: ReturnType<typeof DonateDialog>;

	function getCountdownTimeLeft() {
		if (!nextRaceQuery.current) return 0;
		const lastSession = nextRaceQuery.current.sessions.at(-1);
		if (!lastSession) return 0;

		const nextRaceDate = parseLondon(
			lastSession.date,
			lastSession.time,
			nextRaceQuery.current.year
		);

		return Math.max(nextRaceDate - Date.now(), 0);
	}

	function updateCountdown() {
		const timeLeft = getCountdownTimeLeft();
		countdown = {
			days: Math.floor(timeLeft / (24 * 60 * 60 * 1000)),
			hours: Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)),
			minutes: Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000)),
			seconds: Math.floor((timeLeft % (60 * 1000)) / 1000)
		};

		if (timeLeft <= 0) clearInterval(interval);
	}

	function initCountdown() {
		clearInterval(interval);
		updateCountdown();
		interval = setInterval(updateCountdown, 1000);
	}

	onDestroy(() => {
		clearInterval(interval);
	});

	$effect(() => {
		initCountdown();
		return () => clearInterval(interval);
	});
</script>

<DonateDialog bind:this={donateDialog} />

<div in:fade class="flex flex-col gap-2 overflow-y-auto">
	<div class="hero bg-base-200">
		<div class="hero-content text-center">
			<div class="max-w-xl">
				<h1 class="text-5xl font-bold">Welcome To Season 2</h1>
			</div>
		</div>
	</div>

	<h1 class="text-lg">What's New</h1>
	<div in:fade class="card bg-base-100">
		<div class="card-body items-center justify-center">
			<div class="flex flex-col gap-2">
				<h2 class="text text-left font-bold">Prediction Wagering</h2>
				<p>
					Predictions now cost {WAGER_AMOUNT} to enter. The player who earns the most points after the
					race will win the pot. If there is a tie, it will be split amongst the winners.
				</p>
			</div>
		</div>
	</div>

	{#if seasonWallet.current}
		<div in:fade class="card bg-base-100">
			<div class="card-body items-center justify-center">
				<div class="flex flex-col items-center gap-2">
					<div class="flex flex-col gap-2">
						<h2 class="text text-left font-bold">Season Pot</h2>
						<p>
							Donate to the season pot. The player with the most points at the end of the season
							will win the pot.
						</p>
					</div>
					<div class="flex flex-col gap-2 text-center">
						<button onclick={() => donateDialog.showModal()} class="btn btn-sm"
							>Donate To Season Pot</button
						>
						<p>Current Pot Value: {seasonWallet.current?.balance.toFixed(2)} GBP</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<div in:fade class="card bg-base-100">
		<div class="card-body items-center justify-center">
			<div class="flex flex-col items-center gap-2">
				<div class="flex flex-col gap-2">
					<h2 class="text text-left font-bold">Wild Prediction</h2>
					<p>
						On every race weekend, players can enter in a wild prediction along side their normal
						prediction for a chance to win bonus points. If a wild prediction happens, all players
						will have to mutually agree on the amount of points awarded.
					</p>
				</div>
			</div>
		</div>
	</div>

	<h1 class="text-lg">Countdown To Lights Out</h1>
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
		{@const nextRace = nextRaceQuery.current}
		<div in:fade class="card bg-base-100">
			<div class="card-body items-center justify-center">
				<div class="grid auto-cols-max grid-flow-col gap-5 text-center">
					<div class="flex flex-col">
						<span class="countdown font-mono text-5xl">
							<span
								style:--value={countdown.days}
								aria-live="polite"
								aria-label={countdown.days.toString()}>{countdown.days}</span
							>
						</span>
						days
					</div>
					<div class="flex flex-col">
						<span class="countdown font-mono text-5xl">
							<span
								style:--value={countdown.hours}
								aria-live="polite"
								aria-label={countdown.hours.toString()}>{countdown.hours}</span
							>
						</span>
						hours
					</div>
					<div class="flex flex-col">
						<span class="countdown font-mono text-5xl">
							<span
								style:--value={countdown.minutes}
								aria-live="polite"
								aria-label={countdown.minutes.toString()}>{countdown.minutes}</span
							>
						</span>
						min
					</div>
					<div class="flex flex-col">
						<span class="countdown font-mono text-5xl">
							<span
								style:--value={countdown.seconds}
								aria-live="polite"
								aria-label={countdown.seconds.toString()}>{countdown.seconds}</span
							>
						</span>
						sec
					</div>
				</div>
			</div>
		</div>
		<h1 class="text-lg">Schedule (UK Time)</h1>
		<div class="card bg-base-100">
			<div class="card-body flex h-max items-center justify-center gap-4 text-center lg:flex-row">
				{#each nextRace?.sessions ?? [] as session, index (index)}
					{@const ukSession = formatSessionToUKTime(
						session.date,
						session.time,
						nextRace?.year ?? new Date().getFullYear()
					)}
					<div class="flex flex-col gap-2">
						<h2 class="text-lg font-bold">{session.title}</h2>
						<p class="text-sm">{ukSession.date}</p>
						<p class="text-sm">{ukSession.time}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
