<script lang="ts">
	import { shortAddress } from '$lib/utils';

	const {
		modal,
		signature,
		successText,
		submissionForm
	}: {
		modal: HTMLDialogElement;
		signature: string;
		successText: string;
		submissionForm: HTMLFormElement;
	} = $props();
</script>

<div class="flex flex-col gap-4">
	<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130.2 130.2">
		<circle
			class="path circle stroke-success"
			fill="none"
			stroke-width="6"
			stroke-miterlimit="10"
			cx="65.1"
			cy="65.1"
			r="62.1"
		/>
		<polyline
			class="path check stroke-success"
			fill="none"
			stroke-width="6"
			stroke-linecap="round"
			stroke-miterlimit="10"
			points="100.2,40.2 51.5,88.8 29.8,67.5 "
		/>
	</svg>
	<p class="success text-center text-2xl text-success">{successText}</p>
	<p class="text-center text-xs">{shortAddress(signature)}</p>
	<button
		class="btn btn-info"
		onclick={() => window.open(`https://solscan.io/tx/${signature}`, '_blank')}
		>View on Solscan</button
	>
	<button
		class="btn btn-neutral"
		onclick={() => {
			submissionForm.submit();
			modal.close();
		}}>Close</button
	>
</div>

<style>
	svg {
		width: 100px;
		display: block;
		margin: 0px auto 0;
	}

	.path {
		stroke-dasharray: 1000;
		stroke-dashoffset: 0;
		&.circle {
			-webkit-animation: dash 0.9s ease-in-out;
			animation: dash 0.9s ease-in-out;
		}
		&.check {
			stroke-dashoffset: -100;
			-webkit-animation: dash-check 0.9s 0.35s ease-in-out forwards;
			animation: dash-check 0.9s 0.35s ease-in-out forwards;
		}
	}
	.success {
		margin-top: 20px;
		animation: opacity 0.5s ease-in-out;
	}

	@-webkit-keyframes dash {
		0% {
			stroke-dashoffset: 1000;
		}
		100% {
			stroke-dashoffset: 0;
		}
	}

	@keyframes dash {
		0% {
			stroke-dashoffset: 1000;
		}
		100% {
			stroke-dashoffset: 0;
		}
	}

	@-webkit-keyframes dash-check {
		0% {
			stroke-dashoffset: -100;
		}
		100% {
			stroke-dashoffset: 900;
		}
	}

	@keyframes dash-check {
		0% {
			stroke-dashoffset: -100;
		}
		100% {
			stroke-dashoffset: 900;
		}
	}

	@keyframes opacity {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}
</style>
