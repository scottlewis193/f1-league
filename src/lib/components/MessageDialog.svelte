<script lang="ts">
	import {
		getMessageDialogState,
		closeMessageDialog,
		MessageButtons
	} from '$lib/stores/messagedialog.svelte';

	let confirmDialog: HTMLDialogElement;

	let state = $derived(getMessageDialogState());

	$effect(() => {
		if (state) {
			confirmDialog?.showModal();
		} else {
			confirmDialog?.close();
		}
	});
</script>

<dialog bind:this={confirmDialog} id="confirm-dialog" class="modal modal-bottom sm:modal-middle">
	<div class="modal-box">
		<h3 class="text-lg font-bold">{state?.title}</h3>
		<p class="py-4">{state?.message}</p>
		<div class="flex h-full flex-col items-center justify-center gap-2">
			{#if state?.buttons == MessageButtons.Ok}
				<button class="btn w-full btn-neutral" onclick={() => closeMessageDialog(true)}>Ok</button>
			{:else if state?.buttons == MessageButtons.OkCancel}
				<button class="btn w-full btn-neutral" onclick={() => closeMessageDialog(true)}>Ok</button>
				<button class="btn w-full btn-neutral" onclick={() => closeMessageDialog(false)}
					>Cancel</button
				>
			{:else if state?.buttons == MessageButtons.YesNo}
				<button class="btn w-full btn-neutral" onclick={() => closeMessageDialog(true)}>Yes</button>
				<button class="btn w-full btn-neutral" onclick={() => closeMessageDialog(false)}>No</button>
			{:else if state?.buttons == MessageButtons.YesNoCancel}
				<button class="btn w-full btn-neutral" onclick={() => closeMessageDialog(true)}>Yes</button>
				<button class="btn w-full btn-neutral" onclick={() => closeMessageDialog(false)}>No</button>
				<button class="btn w-full btn-neutral" onclick={() => closeMessageDialog(false)}
					>Cancel</button
				>
			{/if}
		</div>
		<div class="modal-action"></div>
	</div>
</dialog>
