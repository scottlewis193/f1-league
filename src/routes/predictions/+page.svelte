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
	import { getNextRaceOdds } from '$lib/remote/odds.remote';
	import { MessageButtons, showMessageDialog } from '$lib/stores/messagedialog.svelte';
	import { getToastManagerContext } from '$lib/stores/toastmanager.svelte';
	import { getPlayerWallet } from '$lib/remote/players.remote';
	import { playerWalletHasEnoughBalance } from '$lib/remote/transfers.remote';
	import pb from '$lib/pocketbase';
	import PageCard from '$lib/components/PageCard.svelte';
	import {
		areDriverSelectionsValid,
		getDriverOddsPointsPotential,
		getSelectionTotals,
		isPredictionWindowOpen,
		type DriverSelections
	} from '$lib/domain/predictions';
	import { WAGER_AMOUNT } from '$lib/config';

	const wageringEnabled = isWageringEnabled();
	const driversQuery = getDrivers();
	const predictionsQuery = getNextRacePredictions();
	const nextRaceQuery = getNextRace();
	const oddsQuery = getNextRaceOdds();
	const toastManager = getToastManagerContext();

	$effect(() => {
		getPlayerWallet();
	});

	// svelte-ignore non_reactive_update
	let submissionModal: HTMLDialogElement;
	// svelte-ignore non_reactive_update
	let submissionForm: HTMLFormElement;
	let submissionsValid = $state(false);
	let hasUnsavedChanges = $state(false);

	let driverSelections: DriverSelections = $state({
		Driver1st: { value: 'Driver', lastChanged: false, place: 0, exact: 0 },
		Driver2nd: { value: 'Driver', lastChanged: false, place: 0, exact: 0 },
		Driver3rd: { value: 'Driver', lastChanged: false, place: 0, exact: 0 }
	});

	let userSubmissionId: string = $state('');
	let wildPrediction: string = $state('');
	const selectionTotals = $derived(getSelectionTotals(driverSelections));
	const driverNames = $derived(driversQuery.current?.map((driver) => driver.name) ?? []);

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
			wildPrediction = userPredictions.wildPrediction;

			const driver1stOddsPointsPotential = getDriverOddsPointsPotential(
				oddsQuery.current,
				driverSelections.Driver1st.value
			);
			const driver2ndOddsPointsPotential = getDriverOddsPointsPotential(
				oddsQuery.current,
				driverSelections.Driver2nd.value
			);
			const driver3rdOddsPointsPotential = getDriverOddsPointsPotential(
				oddsQuery.current,
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
		return nextRaceQuery.ready && isPredictionWindowOpen(nextRaceQuery.current);
	}

	function validateSelections() {
		submissionsValid = areDriverSelectionsValid(driverSelections);
	}

	async function confirmSufficientBalance() {
		if (await playerWalletHasEnoughBalance()) return true;

		await showMessageDialog({
			title: 'Insufficient funds',
			message: `You need to have at least ${WAGER_AMOUNT} GBP in your wallet to make a submission`,
			buttons: MessageButtons.Ok
		});
		return false;
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
		const oddsPointsPotential = getDriverOddsPointsPotential(
			oddsQuery.current,
			lastChangedDriverSelection.value
		);
		lastChangedDriverSelection.place = oddsPointsPotential.place;
		lastChangedDriverSelection.exact = oddsPointsPotential.exact;

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
	<PageCard>
		<div class="mobile-only space-y-3">
			{#each predictionsQuery.current as submission (submission.id)}
				<div class="card bg-base-200 shadow-sm">
					<div class="card-body gap-3 p-4">
						<div class="flex items-center justify-between">
							<div class="text-lg font-bold">{submission.expand.user.name}</div>
							<div class="badge badge-outline">Top 3</div>
						</div>

						<div class="grid gap-2">
							{#each submission.predictions as prediction, index (prediction)}
								{@const oddsPointsPotential = getDriverOddsPointsPotential(
									oddsQuery.current,
									prediction
								)}
								<div class="flex items-center justify-between rounded-box bg-base-100 p-3">
									<div>
										<div class="text-xs opacity-60">
											{index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : 'rd'}
										</div>
										<div class="font-bold">{prediction}</div>
									</div>
									<div class="flex gap-3 text-sm opacity-70">
										<span>Pl {oddsPointsPotential.place}</span>
										<span>Ex {oddsPointsPotential.exact}</span>
									</div>
								</div>
							{/each}
						</div>

						{#if submission.wildPrediction}
							<div class="rounded-box bg-base-100 p-3 text-sm">
								<div class="mb-1 font-bold">Wild Prediction</div>
								{submission.wildPrediction}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<table class="desktop-only table">
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
						oddsQuery.current,
						submission.predictions[0]
					)}
					{@const driver2ndOddsPointsPotential = getDriverOddsPointsPotential(
						oddsQuery.current,
						submission.predictions[1]
					)}
					{@const driver3rdOddsPointsPotential = getDriverOddsPointsPotential(
						oddsQuery.current,
						submission.predictions[2]
					)}
					<tr>
						<td rowspan="2" class="text-lg font-bold">
							{submission.expand.user.name}
						</td>
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
					<tr>
						<td colspan="3">{submission.wildPrediction}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</PageCard>

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
				{...addUpdatePrediction.enhance(async ({ element, submit }) => {
					try {
						await submit();
						element.reset();
						toastManager.addToast('Submission successful', 'success');
					} catch {
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
										drivers={driverNames}
									/>
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
										drivers={driverNames}
									/>
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
										drivers={driverNames}
									/>
									/></td
								>
								<td>{driverSelections.Driver3rd.place}</td>
								<td>{driverSelections.Driver3rd.exact}</td>
							</tr>
							<tr class="h-16">
								<th></th>
								<td class="text-right font-bold">Total</td>
								<td>{selectionTotals.place}</td><td>{selectionTotals.exact}</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div class="flex flex-col gap-2 rounded-box border border-base-content/5 p-2">
					<textarea
						class="textarea w-full"
						id="wildPrediction"
						name="wildPrediction"
						rows="5"
						cols="30"
						placeholder="Type your wild prediction here (optional)">{wildPrediction}</textarea
					>
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
									const hasEnoughBalance = await confirmSufficientBalance();
									if (!hasEnoughBalance) return;
								}
								submissionForm.requestSubmit();

								hasUnsavedChanges = false;
							}}
							disabled={!submissionsValid}
							type="button"
							class="btn mt-4 w-full btn-success"
							>{userHasSubmitted(predictionsQuery.current, pb.authStore.record?.id || '')
								? 'Submit'
								: `Submit${wageringEnabled.current ? ` (£${WAGER_AMOUNT}.00)` : ''}`}</button
						>
					</div>
				</div>
			</form>
		</div>
	</dialog>
{/if}
