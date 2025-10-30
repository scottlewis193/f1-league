<script lang="ts">
	let { modal }: { modal: HTMLDialogElement } = $props();
</script>

<div class="flex h-full flex-col justify-center gap-4">
	<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130.2 130.2">
		<circle
			class="path circle stroke-error"
			fill="none"
			stroke-width="6"
			stroke-miterlimit="10"
			cx="65.1"
			cy="65.1"
			r="62.1"
		/>
		<line
			class="path line stroke-error"
			fill="none"
			stroke-width="6"
			stroke-linecap="round"
			stroke-miterlimit="10"
			x1="34.4"
			y1="37.9"
			x2="95.8"
			y2="92.3"
		/>
		<line
			class="path line stroke-error"
			fill="none"
			stroke-width="6"
			stroke-linecap="round"
			stroke-miterlimit="10"
			x1="95.8"
			y1="38"
			x2="34.4"
			y2="92.2"
		/>
	</svg>
	<p class="error text-center text-2xl text-error">Failed To Send. Please Try Again.</p>
	<button class="btn btn-neutral" onclick={() => modal.close()}>Close</button>
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
		&.line {
			stroke-dashoffset: 1000;
			-webkit-animation: dash 0.9s 0.35s ease-in-out forwards;
			animation: dash 0.9s 0.35s ease-in-out forwards;
		}
	}

	.error {
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
