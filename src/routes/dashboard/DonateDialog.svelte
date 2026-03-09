<script lang="ts">
	import { enhance } from '$app/forms';
	import { withdraw } from '$lib/remote/players.remote';
	import { transferToSeasonWallet } from '$lib/remote/transfers.remote';
	import { getToastManagerContext } from '$lib/stores/toastmanager.svelte';

	let amount = $state(0);
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
			{...transferToSeasonWallet.enhance(async ({ form, data, submit }) => {
				try {
					await submit();
					form.reset();
					toastManager.addToast('Donation successful', 'success');
				} catch (error) {
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
	</div>
</dialog>
