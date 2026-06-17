<script lang="ts">
	import { withdraw } from '$lib/remote/players.remote';
	import { getToastManagerContext } from '$lib/stores/toastmanager.svelte';

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

<dialog id="withdraw-dialog" bind:this={dialog} class="modal">
	<div class="modal-box">
		<h2 class="text-lg font-bold">Withdraw Funds</h2>
		<p class="py-4">Enter the amount you want to withdraw:</p>
		<form
			{...withdraw.enhance(async ({ element, submit }) => {
				try {
					await submit();
					element.reset();
					toastManager.addToast('Withdrawal successful', 'success');
				} catch {
					toastManager.addToast('Withdrawal failed', 'error');
				}
				dialog?.close();
			})}
		>
			<input
				class="input"
				step="0.01"
				min="0.01"
				maxlength="4"
				{...withdraw.fields.amount.as('number')}
			/>
			<div class="modal-action">
				<button class="btn" type="submit">Withdraw</button>
				<button class="btn" type="button" onclick={toggleModal}>Cancel</button>
			</div>
		</form>
	</div>
</dialog>
