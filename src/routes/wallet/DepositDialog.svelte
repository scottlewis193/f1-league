<script lang="ts">
	import { CopyIcon } from '$lib/components/icons';
	import { getToastManagerContext } from '$lib/stores/toastmanager.svelte';

	let { walletId }: { walletId: string } = $props();

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

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toastManager.addToast('Copied to clipboard', 'info', 3000);
	}
</script>

<dialog id="deposit-dialog" bind:this={dialog} class="modal">
	<div class="modal-box">
		<div class="flex flex-col gap-2">
			<h2 class="text-lg font-bold">Bank Details</h2>

			<p class="label">Name</p>
			<div class="flex justify-between">
				<p class="text-primary">Scott Anthony Lewis</p>
				<button class="btn btn-sm" onclick={() => copyToClipboard('Scott Anthony Lewis')}
					><CopyIcon /></button
				>
			</div>
			<p class="label">Sort Code</p>
			<div class="flex justify-between">
				<p class="text-primary">23-08-01</p>
				<button class="btn btn-sm" onclick={() => copyToClipboard('230801')}><CopyIcon /></button>
			</div>
			<p class="label">Account Number</p>
			<div class="flex justify-between">
				<p class="text-primary">46776583</p>
				<button class="btn btn-sm" onclick={() => copyToClipboard('46776583')}><CopyIcon /></button>
			</div>

			<p class="label">Reference</p>
			<div class="flex justify-between">
				<p class="text-primary">{walletId}</p>
				<button class="btn btn-sm" onclick={() => copyToClipboard(walletId)}><CopyIcon /></button>
			</div>
			<br />
			<p class="text-sm text-warning">
				Ensure you include the reference in your deposit otherwise you will not be credited
			</p>
			<button class="btn" onclick={() => toggleModal()}>Close</button>
		</div>
	</div>
</dialog>
