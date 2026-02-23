<script lang="ts">
	import SubmissionSelect from '$lib/components/submissions/SubmissionSelect.svelte';
	import { getDrivers } from '$lib/remote/drivers.remote.js';
	import { getNextRace } from '$lib/remote/races.remote';
	import {
		addUpdatePrediction,
		getNextRacePredictions,
		isWageringEnabled
	} from '$lib/remote/predictions.remote.js';
	import { userHasSubmitted } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import { getNextRaceOdds } from '$lib/remote/odds.remote';
	import { MessageButtons, showMessageDialog } from '$lib/stores/messagedialog.svelte';
	import { getToastManagerContext } from '$lib/stores/toastmanager.svelte';
	import { getPlayerWallet } from '$lib/remote/players.remote';
	import {
		playerWalletHasEnoughBalance,
		transferToPredictionWallet
	} from '$lib/remote/transfers.remote';
	import pb from '$lib/pocketbase';

	const wageringEnabled = isWageringEnabled();
	const driversQuery = getDrivers();
	const predictionsQuery = getNextRacePredictions();
	const nextRaceQuery = getNextRace();
	const oddsQuery = getNextRaceOdds();
	const toastManager = getToastManagerContext();
	let wallet = await getPlayerWallet();

	// svelte-ignore non_reactive_update
	let submissionModal: HTMLDialogElement;
	// svelte-ignore non_reactive_update
	let submissionForm: HTMLFormElement;
	let submissionsValid = $state(false);
	let hasUnsavedChanges = $state(false);

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

			const driver1stOddsPointsPotential = getDriverOddsPointsPotential(
				driverSelections.Driver1st.value
			);
			const driver2ndOddsPointsPotential = getDriverOddsPointsPotential(
				driverSelections.Driver2nd.value
			);
			const driver3rdOddsPointsPotential = getDriverOddsPointsPotential(
				driverSelections.Driver3rd.value
			);

			driverSelections.Driver1st.place = driver1stOddsPointsPotential.place;
			driverSelections.Driver2nd.place = driver2ndOddsPointsPotential.place;
			driverSelections.Driver3rd.place = driver3rdOddsPointsPotential.place;
			driverSelections.Driver1st.exact = driver1stOddsPointsPotential.exact;
			driverSelections.Driver2nd.exact = driver2ndOddsPointsPotential.exact;
			driverSelections.Driver3rd.exact = driver3rdOddsPointsPotential.exact;
		}

		validateSelections();
		hasUnsavedChanges = false;
	}

	async function closeModalWithConfirmation() {
		if (hasUnsavedChanges) {
			const confirmed = await showMessageDialog({
				title: 'Unsaved Changes',
				message: 'You have unsaved predictions. Are you sure you want to close?',
				buttons: MessageButtons.YesNo
			});
			if (!confirmed) return;
		}
		hasUnsavedChanges = false;
		submissionModal.close();
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

	function validateSelections() {
		console.log('validatingSelections');
		for (const driverSelection of Object.values(driverSelections)) {
			if (driverSelection.value === 'Driver') {
				submissionsValid = false;
				return;
			}
		}

		submissionsValid = true;
	}

	async function sendToPredictionWallet() {
		if (!(await playerWalletHasEnoughBalance())) {
			await showMessageDialog({
				title: 'Insufficient funds',
				message: 'You need to have at least 5 GBP in your wallet to make a submission',
				buttons: MessageButtons.Ok
			});
			return false;
		}

		return await transferToPredictionWallet();
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

		console.log(oddsQuery.current);

		//update place and exact based on selection
		lastChangedDriverSelection.place =
			oddsQuery.current?.find(
				(oddsRecord) => (oddsRecord.expand.driver?.name ?? '') === lastChangedDriverSelection.value
			)?.pointsForPlace ?? 0;

		lastChangedDriverSelection.exact =
			oddsQuery.current?.find(
				(oddsRecord) => (oddsRecord.expand.driver?.name ?? '') === lastChangedDriverSelection.value
			)?.pointsForExact || 0;

		for (const driverSelection of Object.values(driverSelections)) {
			if (
				driverSelection.value === lastChangedDriverSelection.value &&
				!driverSelection.lastChanged
			) {
				driverSelection.value = 'Driver';
			}
		}

		validateSelections();
		hasUnsavedChanges = true;

		lastChangedDriverSelection.lastChanged = false;
	});
</script>

{#if predictionsQuery.current && driversQuery.current && nextRaceQuery.current}
	<div in:fade class="card h-full w-full overflow-auto bg-base-100">
		<div class="card-body">
			<table class="table not-md:table-sm">
				<thead>
					<tr>
						<th class="w-1/4">Player</th>
						<th class="w-1/4">1st</th>
						<th class="w-1/4">2nd</th>
						<th class="w-1/4">3rd</th>
					</tr>
				</thead>
				<tbody>
					{#each predictionsQuery.current as submission (submission.id)}
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
			<form
				bind:this={submissionForm}
				class="flex w-full flex-col justify-center"
				{...addUpdatePrediction.enhance(async ({ form, data, submit }) => {
					try {
						await submit();
						form.reset();
						toastManager.addToast('Submission successful', 'success');
					} catch (error) {
						toastManager.addToast('Submission failed', 'error');
					}
					submissionModal?.close();
				})}
			>
				<div class="overflow-hidden rounded-box border border-base-content/5 bg-base-100">
					<table class="table">
						<!-- head -->
						<thead>
							<tr>
								<th class="w-[10%]">Pos</th>
								<th class="w-[60%]">Driver</th>
								<th class="w-[15%]">Pl</th>
								<th class="w-[15%]">Ex</th>
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
							onclick={closeModalWithConfirmation}>Cancel</button
						>
					</div>
					<div class="w-1/2">
						<button
							onclick={async () => {
								if (
									wageringEnabled.current &&
									!userHasSubmitted(predictionsQuery.current, pb.authStore.record?.id || '')
								) {
									const result = await sendToPredictionWallet();
									if (!result) return;
								}
								submissionForm.requestSubmit();

								hasUnsavedChanges = false;
							}}
							disabled={!submissionsValid}
							type="button"
							class="btn mt-4 w-full btn-success"
							>{userHasSubmitted(predictionsQuery.current, pb.authStore.record?.id || '')
								? 'Submit'
								: 'Submit' + (wageringEnabled.current ? ' (£5.00)' : '')}</button
						>
					</div>
				</div>
			</form>
		</div>
	</dialog>
{/if}
