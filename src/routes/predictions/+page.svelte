<script lang="ts">
	import { PUBLIC_PB_URL } from '$env/static/public';
	import SubmissionSelect from '$lib/components/SubmissionSelect.svelte';
	import { getDrivers } from '$lib/remote/drivers.remote.js';
	import { getNextRace } from '$lib/remote/races.remote';
	import { addUpdatePrediction, getNextRacePredictions } from '$lib/remote/predictions.remote.js';
	import { getPointsGained, titleCase, userHasSubmitted } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import PocketBase from 'pocketbase';
	import { onMount } from 'svelte';
	import { getNextRaceOdds } from '$lib/remote/odds.remote';

	const driversQuery = getDrivers();
	const predictionsQuery = getNextRacePredictions();
	const nextRaceQuery = getNextRace();
	const oddsQuery = getNextRaceOdds();
	const pb = new PocketBase(PUBLIC_PB_URL);

	onMount(() => {
		pb.authStore.loadFromCookie(document.cookie);
	});

	// svelte-ignore non_reactive_update
	let submissionModal: HTMLDialogElement;

	let driverSelections = $state({
		Driver1st: { value: 'Driver', lastChanged: false, place: 0, exact: 0 },
		Driver2nd: { value: 'Driver', lastChanged: false, place: 0, exact: 0 },
		Driver3rd: { value: 'Driver', lastChanged: false, place: 0, exact: 0 }
	});

	let userSubmissionId: string = $state('');

	function loadUserSelections() {
		if (!predictionsQuery.ready) return;
		const userPredictions = predictionsQuery.current.find(
			(submission) => submission.expand.user.id === pb.authStore.record?.id
		);
		if (userPredictions) {
			driverSelections.Driver1st.value = userPredictions.predictions[0];
			driverSelections.Driver2nd.value = userPredictions.predictions[1];
			driverSelections.Driver3rd.value = userPredictions.predictions[2];
			userSubmissionId = userPredictions.id;
		}
	}

	function isSubmissionWindowOpen() {
		if (!nextRaceQuery.ready) return false;
		const firstSession = nextRaceQuery.current.sessions[0];
		const year = nextRaceQuery.current.year;
		const now = new Date();

		const raceWeekendStartDate = new Date(
			Date.parse(firstSession.date + ' ' + year + ' ' + firstSession.time)
		);

		return now < raceWeekendStartDate;
	}

	function getDriverOddsPointsPotential(driverName: string) {
		const driverOddsRecord = oddsQuery.current?.find(
			(oddsRecord) => oddsRecord.expand.driver.name === driverName
		);
		return {
			place: driverOddsRecord?.pointsForPlace || 0,
			exact: driverOddsRecord?.pointsForExact || 0
		};
	}

	$effect(() => {
		//this is to check if the user has selected the same driver for more than one position
		//if they have, we will reset the one that isn't the last changed one
		const lastChangedDriverSelection = Object.values(driverSelections).find(
			(driver) => driver.lastChanged
		);
		if (!lastChangedDriverSelection) {
			return;
		}

		//update place and exact based on selection
		lastChangedDriverSelection.place =
			oddsQuery.current?.find(
				(oddsRecord) => oddsRecord.expand.driver.name === lastChangedDriverSelection.value
			)?.pointsForPlace || 0;
		lastChangedDriverSelection.exact =
			oddsQuery.current?.find(
				(oddsRecord) => oddsRecord.expand.driver.name === lastChangedDriverSelection.value
			)?.pointsForExact || 0;

		for (const driver of Object.values(driverSelections)) {
			if (driver.value === lastChangedDriverSelection.value && !driver.lastChanged) {
				driver.value = 'Driver';
			}
		}
		lastChangedDriverSelection.lastChanged = false;
	});
</script>

{#if predictionsQuery.error}
	<p>{predictionsQuery.error}</p>
{:else if predictionsQuery.loading}
	<div class="flex h-full w-full items-center justify-center">
		<span class="loading loading-md loading-spinner"></span>
	</div>
{:else if predictionsQuery.ready && nextRaceQuery.ready && driversQuery.ready && oddsQuery.ready}
	<div in:fade class="card h-full w-full overflow-auto bg-base-100">
		<div class="card-body">
			<table class="table">
				<thead>
					<tr>
						<th class="w-1/4">Player</th>
						<th class="w-1/4">1st</th>
						<th class="w-1/4">2nd</th>
						<th class="w-1/4">3rd</th>
					</tr>
				</thead>
				<tbody>
					{#each predictionsQuery.current as submission, index}
						{@const driver1stOddsPointsPotential = getDriverOddsPointsPotential(
							submission.predictions[0]
						)}
						{@const driver2ndOddsPointsPotential = getDriverOddsPointsPotential(
							submission.predictions[1]
						)}
						{@const driver3rdOddsPointsPotential = getDriverOddsPointsPotential(
							submission.predictions[2]
						)}
						<tr>
							<td class="font-bold">{submission.expand.user.name}</td>
							<td>
								<div class="flex flex-col">
									<div>{submission.predictions[0]}</div>
									<div class="flex opacity-50">
										<div class="w-1/2">Pl</div>
										<div class="w-1/2 text-right">{driver1stOddsPointsPotential.place}</div>
									</div>
									<div class="flex opacity-50">
										<div class="w-1/2">Ex</div>
										<div class="w-1/2 text-right">{driver1stOddsPointsPotential.exact}</div>
									</div>
								</div>
							</td>
							<td>
								<div class="flex flex-col">
									<div>{submission.predictions[1]}</div>
									<div class="flex opacity-50">
										<div class="w-1/2">Pl</div>
										<div class="w-1/2 text-right">{driver2ndOddsPointsPotential.place}</div>
									</div>
									<div class="flex opacity-50">
										<div class="w-1/2">Ex</div>
										<div class="w-1/2 text-right">{driver2ndOddsPointsPotential.exact}</div>
									</div>
								</div>
							</td>
							<td>
								<div class="flex flex-col">
									<div>{submission.predictions[2]}</div>

									<div class="flex opacity-50">
										<div class="w-1/2">Pl</div>
										<div class="w-1/2 text-right">{driver3rdOddsPointsPotential.place}</div>
									</div>
									<div class="flex opacity-50">
										<div class="w-1/2">Ex</div>
										<div class="w-1/2 text-right">{driver3rdOddsPointsPotential.exact}</div>
									</div>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	<button
		disabled={!isSubmissionWindowOpen()}
		onclick={() => {
			loadUserSelections();
			submissionModal.showModal();
		}}
		class="btn btn-primary"
		>{userHasSubmitted(predictionsQuery.current, pb.authStore.record?.id || '')
			? 'Edit Predictions'
			: 'Submit Predictions'}</button
	>

	<!--submission modal-->
	<dialog bind:this={submissionModal} id="submission-modal" class="modal overflow-hidden">
		<div class="modal-box flex justify-center overflow-hidden">
			<form class="flex w-full flex-col justify-center" {...addUpdatePrediction}>
				<!-- <div class="flex justify-end gap-4">
					<button
						type="button"
						onclick={() => submissionModal.close()}
						class="btn btn-circle btn-ghost btn-sm">✕</button
					>
				</div> -->
				<div class="overflow-hidden rounded-box border border-base-content/5 bg-base-100">
					<table class="table">
						<!-- head -->
						<thead>
							<tr>
								<th class="w-1/10">Pos</th>
								<th class="w-5/10">Driver</th>
								<th class="w-2/10">Pl</th>
								<th class="w-2/10">Ex</th>
							</tr>
						</thead>
						<tbody>
							<!-- row 1 -->
							<tr>
								<th>1st</th>
								<td class="flex justify-center">
									<SubmissionSelect
										id="1st"
										bind:driver={driverSelections.Driver1st}
										drivers={driversQuery.current.map((driver) => driver.name)}
									/></td
								>
								<td>{driverSelections.Driver1st.place}</td>
								<td>{driverSelections.Driver1st.exact}</td>
							</tr>
							<!-- row 2 -->
							<tr>
								<th>2nd</th>
								<td class="flex justify-center">
									<SubmissionSelect
										id="2nd"
										bind:driver={driverSelections.Driver2nd}
										drivers={driversQuery.current.map((driver) => driver.name)}
									/></td
								>
								<td>{driverSelections.Driver2nd.place}</td>
								<td>{driverSelections.Driver2nd.exact}</td>
							</tr>
							<!-- row 3 -->
							<tr>
								<th>3rd</th>
								<td class="flex justify-center">
									<SubmissionSelect
										id="3rd"
										bind:driver={driverSelections.Driver3rd}
										drivers={driversQuery.current.map((driver) => driver.name)}
									/></td
								>
								<td>{driverSelections.Driver3rd.place}</td>
								<td>{driverSelections.Driver3rd.exact}</td>
							</tr>
							<tr class="h-16">
								<th></th>
								<td class="text-right font-bold">Total</td>
								<td
									>{Object.values(driverSelections)
										.map((driver) => driver.place)
										.reduce((a, b) => a + b, 0)}</td
								><td
									>{Object.values(driverSelections)
										.map((driver) => driver.exact)
										.reduce((a, b) => a + b, 0)}</td
								>
							</tr>
						</tbody>
					</table>
				</div>
				<!-- submit raceNo with hidden input -->
				<input type="hidden" name="raceId" value={nextRaceQuery.current.id} />
				<input type="hidden" name="id" value={userSubmissionId} />

				<!-- if there is a button in form, it will close the modal -->
				<div class="flex w-full gap-2">
					<div class="w-1/2">
						<button
							type="reset"
							class="btn mt-4 w-full btn-error"
							onclick={() => submissionModal.close()}>Cancel</button
						>
					</div>
					<div class="w-1/2">
						<button
							type="submit"
							class="btn mt-4 w-full btn-success"
							onclick={() => submissionModal.close()}>Submit</button
						>
					</div>
				</div>
			</form>
		</div>
	</dialog>
{/if}
