<script lang="ts">
	import { onMount } from 'svelte';
	import ConfirmSuccess from './ConfirmSuccess.svelte';
	import ConfirmFail from './ConfirmFail.svelte';

	let {
		signature = '',
		hasFailed = false,
		successText = 'Sent Successfully',
		submissionForm
	}: {
		signature?: string;
		hasFailed?: boolean;
		successText?: string;
		submissionForm: HTMLFormElement;
	} = $props();

	// svelte-ignore non_reactive_update
	let txSigConfirmDialog: HTMLDialogElement;
</script>

<!-- Open the modal using ID.showModal() method -->
<dialog bind:this={txSigConfirmDialog} id="txSigConfirmDialog" class="modal">
	<div class="modal-box h-[28rem] overflow-hidden">
		<div class="flex h-full flex-col items-center justify-center gap-2">
			{#if signature}
				<ConfirmSuccess modal={txSigConfirmDialog} {signature} {successText} {submissionForm} />
			{:else if hasFailed}
				<ConfirmFail modal={txSigConfirmDialog} />
			{:else}
				<p class="text-sm">Awaiting User Confirmation...</p>
				<progress class="progress w-56"></progress>
			{/if}
		</div>
		<div class="modal-action"></div>
	</div>
</dialog>
