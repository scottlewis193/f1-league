<script lang="ts">
	import { transferToSeasonWallet } from '$lib/remote/transfers.remote';
	import { getDonationTotals } from '$lib/remote/wallets.remote';
	import { getToastManagerContext } from '$lib/stores/toastmanager.svelte';

	const donationTotals = getDonationTotals();

	let dialog = $state<HTMLDialogElement>();
	const toastManager = getToastManagerContext();

	export function showModal() {
		if (!dialog) return;

		dialog.showModal();
	}

	export function toggleModal() {
		if (!dialog) return;
		if (dialog.open) {
			dialog.close();
		} else {
			dialog.showModal();
		}
	}
</script>

<dialog id="donate-dialog" bind:this={dialog} class="modal">
	<div class="modal-box">
		<h2 class="text-lg font-bold">Donate Funds</h2>
		<p class="py-4">Enter the amount you want to donate:</p>
		<form
			{...transferToSeasonWallet.enhance(async (form) => {
				try {
					await form.submit();
					form.element.reset();
					toastManager.addToast('Donation successful', 'success');
				} catch {
					toastManager.addToast('Donation failed', 'error');
				}
				dialog?.close();
			})}
		>
			<input
				class="input"
				step="0.01"
				min="0.01"
				maxlength="4"
				{...transferToSeasonWallet.fields.amount.as('number')}
			/>
			<div class="modal-action">
				<button class="btn" type="submit">Donate</button>
				<button class="btn" type="button" onclick={toggleModal}>Cancel</button>
			</div>
		</form>

		{#if donationTotals.current}
			<div class="mt-4">
				<div class="text-muted-foreground flex justify-between py-1 text-xs">
					<span>Name</span>
					<span class="w-20 text-right">Donated</span>
					<span class="w-20 text-right">Owed</span>
				</div>
				{#each donationTotals.current as entry}
					<div class="flex justify-between py-1 text-sm">
						<span>{entry.name}</span>
						<span class="w-20 text-right">£{entry.totalDonated.toFixed(2)}</span>
						<span
							class:w-text-success={Number(entry.owed) <= 0}
							class:w-text-error={Number(entry.owed) > 0}
							class="w-20 text-right">£{entry.owed.toFixed(2)}</span
						>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</dialog>
