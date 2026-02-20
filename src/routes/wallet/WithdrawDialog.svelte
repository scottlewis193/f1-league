<script lang="ts">
	import { enhance } from '$app/forms';
	import { withdraw } from '$lib/remote/players.remote';
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

<dialog id="withdraw-dialog" bind:this={dialog} class="modal">
	<div class="modal-box">
		<h2 class="text-lg font-bold">Withdraw Funds</h2>
		<p class="py-4">Enter the amount you want to withdraw:</p>
		<form
			{...withdraw.enhance(async ({ form, data, submit }) => {
				try {
					await submit();
					form.reset();
					toastManager.addToast('Withdrawal successful', 'success');
				} catch (error) {
					toastManager.addToast('Withdrawal failed', 'error');
				}
				dialog?.close();
			})}
		>
			<input class="input" min="0.01" {...withdraw.fields.amount.as('number')} />
			<div class="modal-action">
				<button class="btn" type="submit">Withdraw</button>
			</div>
		</form>
	</div>
</dialog>
