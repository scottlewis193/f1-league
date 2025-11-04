<script lang="ts">
	import { PUBLIC_PB_URL, PUBLIC_POT_WALLET_ADDRESS } from '$env/static/public';
	import SubmissionSelect from '$lib/components/submissions/SubmissionSelect.svelte';
	import { getDrivers } from '$lib/remote/drivers.remote.js';
	import { getNextRace } from '$lib/remote/races.remote';
	import {
		addUpdatePrediction,
		getNextRacePredictions,
		isWageringEnabled
	} from '$lib/remote/predictions.remote.js';
	import { usdToGbp, userHasSubmitted } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import PocketBase from 'pocketbase';
	import { onMount } from 'svelte';
	import { getNextRaceOdds } from '$lib/remote/odds.remote';
	import TxSigConfirmDialog from '$lib/components/txconfirm/TxSigConfirmDialog.svelte';
	import { restoreWallet, sendUSDC, wallet } from '$lib/stores/wallet.svelte';
	import { MessageButtons, showMessageDialog } from '$lib/stores/messagedialog.svelte';
	import { getToastManagerContext } from '$lib/stores/toastmanager.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';

	const wageringEnabled = isWageringEnabled();
	const driversQuery = getDrivers();
	const predictionsQuery = getNextRacePredictions();
	const nextRaceQuery = getNextRace();
	const oddsQuery = getNextRaceOdds();
	const toastManager = getToastManagerContext();

	const pb = new PocketBase(PUBLIC_PB_URL);

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

	//last confirmed transaction
	let confirmedTx = $state({ signature: '', hasFailed: false });

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
		for (const driverSelection of Object.values(driverSelections)) {
			if (driverSelection.value === 'Driver') {
				submissionsValid = false;
				return;
			}
		}

		submissionsValid = true;
	}

	async function sendToPot() {
		if (!wallet.connected) {
			await showMessageDialog({
				title: 'Wallet not connected',
				message: 'Please connect your wallet to make a submission',
				buttons: MessageButtons.Ok
			});
			return;
		}
		if ((await usdToGbp(wallet.balanceUSDC)) < 5) {
			await showMessageDialog({
				title: 'Insufficient funds',
				message: 'You need to have at least 5 GBP in your wallet to make a submission',
				buttons: MessageButtons.Ok
			});
			return;
		}
		const confirmDialog = document.getElementById('txSigConfirmDialog') as HTMLDialogElement;
		confirmDialog.showModal();
		const details = await sendUSDC(
			wallet.publicKey?.toBase58() || '',
			PUBLIC_POT_WALLET_ADDRESS,
			5,
			'F1 League: Sent 5 GBP in USDC to the pot'
		);
		confirmedTx.signature = details.signature || '';
		confirmedTx.hasFailed = details.hasFailed;
	}

	onMount(async () => {
		pb.authStore.loadFromCookie(document.cookie);
		if (wageringEnabled.current) await restoreWallet();
	});

	$effect(() => {
		// if (
		// 	predictionsQuery.current &&
		// 	nextRaceQuery.current &&
		// 	driversQuery.current &&
		// 	oddsQuery.current
		// ) {
		// 	submissionModal.showModal();
		// }

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

{#if predictionsQuery.error}
	<ErrorState
		title="Failed to load predictions"
		message="We couldn't load the predictions data. Please check your connection and try again."
		error={predictionsQuery.error}
		onRetry={() => predictionsQuery.refresh?.()}
	/>
{:else if predictionsQuery.loading}
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
					{#each Array(5) as _, i (i)}
						<tr>
							<td><Skeleton type="text" width="70%" /></td>
							<td>
								<div class="flex flex-col gap-1">
									<Skeleton type="text" width="80%" />
									<Skeleton type="text" width="40%" />
								</div>
							</td>
							<td>
								<div class="flex flex-col gap-1">
									<Skeleton type="text" width="80%" />
									<Skeleton type="text" width="40%" />
								</div>
							</td>
							<td>
								<div class="flex flex-col gap-1">
									<Skeleton type="text" width="80%" />
									<Skeleton type="text" width="40%" />
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	<Skeleton type="button" width="100%" height="3rem" />
{:else if predictionsQuery.ready && nextRaceQuery.ready && driversQuery.ready && oddsQuery.ready && wageringEnabled.ready}
	{#if predictionsQuery.current.length === 0}
		<EmptyState
			title="No predictions yet"
			description="Be the first to submit your predictions for the next race!"
			actionText="Submit Predictions"
			onAction={() => {
				loadUserSelections();
				submissionModal.showModal();
			}}
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
						d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
					/>
				</svg>
			{/snippet}
		</EmptyState>
	{:else}
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
	{/if}
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
				{...addUpdatePrediction}
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
								if (wageringEnabled.current) {
									await sendToPot();
								} else {
									submissionForm.requestSubmit();
								}
								hasUnsavedChanges = false;
								toastManager.addToast('Submission successful!', 'success');
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
		<TxSigConfirmDialog
			hasFailed={confirmedTx.hasFailed}
			signature={confirmedTx.signature}
			{submissionForm}
		/>
	</dialog>
{/if}
