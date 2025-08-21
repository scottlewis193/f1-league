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

	const driversQuery = getDrivers();
	const predictionsQuery = getNextRacePredictions();
	const nextRaceQuery = getNextRace();
	const pb = new PocketBase(PUBLIC_PB_URL);

	onMount(() => {
		pb.authStore.loadFromCookie(document.cookie);
	});

	// svelte-ignore non_reactive_update
	let submissionModal: HTMLDialogElement;

	let driverSelections = $state({
		Driver1st: { value: 'Select a Driver', lastChanged: false },
		Driver2nd: { value: 'Select a Driver', lastChanged: false },
		Driver3rd: { value: 'Select a Driver', lastChanged: false }
	});

	let userSubmissionId: string = $state('');

	const loadUserSelections = () => {
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
	};

	const isSubmissionWindowOpen = () => {
		if (!nextRaceQuery.ready) return false;
		const firstSession = nextRaceQuery.current.sessions[0];
		const year = nextRaceQuery.current.year;
		const now = new Date();

		const raceWeekendStartDate = new Date(
			Date.parse(firstSession.date + ' ' + year + ' ' + firstSession.time)
		);

		return now > raceWeekendStartDate;
	};

	$effect(() => {
		//this is to check if the user has selected the same driver for more than one position
		//if they have, we will reset the one that isn't the last changed one
		const lastChangedDriverSelection = Object.values(driverSelections).find(
			(driver) => driver.lastChanged
		);
		if (!lastChangedDriverSelection) {
			return;
		}

		for (const driver of Object.values(driverSelections)) {
			if (driver.value === lastChangedDriverSelection.value && !driver.lastChanged) {
				driver.value = 'Select a Driver';
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
{:else if predictionsQuery.ready && nextRaceQuery.ready && driversQuery.ready}
	<div in:fade class="card h-full w-full overflow-auto bg-base-100">
		<div class="card-body">
			<table class="table">
				<thead>
					<tr>
						<th>Player</th>
						<th>1st</th>
						<th>2nd</th>
						<th>3rd</th>
						<!-- <th>Points Gained</th> -->
					</tr>
				</thead>
				<tbody>
					{#each predictionsQuery.current as submission, index}
						<tr>
							<td>{submission.expand.user.name}</td>
							<td>{submission.predictions[0]}</td>
							<td>{submission.predictions[1]}</td>
							<td>{submission.predictions[2]}</td>
							<!-- <td>{getPointsGained(nextRaceQuery.current, submission)}</td> -->
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	<button
		disabled={isSubmissionWindowOpen()}
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
	<dialog bind:this={submissionModal} id="submission-modal" class="modal">
		<div class="modal-box flex h-100 justify-center">
			<button
				onclick={() => submissionModal.close()}
				class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm">✕</button
			>
			<div class="flex justify-center">
				<form class="flex flex-col justify-center gap-4" {...addUpdatePrediction}>
					<div class="flex flex-col items-center gap-4">
						<div>
							<SubmissionSelect
								id="1st"
								bind:driver={driverSelections.Driver1st}
								drivers={driversQuery.current.map((driver) => driver.name)}
							/>
						</div>
						<div>
							<SubmissionSelect
								id="2nd"
								bind:driver={driverSelections.Driver2nd}
								drivers={driversQuery.current.map((driver) => driver.name)}
							/>
						</div>
						<div>
							<SubmissionSelect
								id="3rd"
								bind:driver={driverSelections.Driver3rd}
								drivers={driversQuery.current.map((driver) => driver.name)}
							/>
						</div>

						<!-- submit raceNo with hidden input -->
						<input type="hidden" name="race-id" value={nextRaceQuery.current.id} />
						<input type="hidden" name="id" value={userSubmissionId} />
					</div>
					<!-- if there is a button in form, it will close the modal -->
					<button
						type="submit"
						class="btn mt-4 btn-secondary"
						onclick={() => submissionModal.close()}>Submit</button
					>
				</form>
			</div>
		</div>
	</dialog>
{/if}
