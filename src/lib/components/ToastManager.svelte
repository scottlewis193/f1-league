<script lang="ts">
	import { getToastManagerContext } from '$lib/stores/toastmanager.svelte';

	const toastManager = getToastManagerContext();
</script>

{#if toastManager.toasts}
	{#each toastManager.toasts as toast (toast.id)}
		<div class="toast toast-end toast-bottom z-50">
			<div
				class="relative alert overflow-hidden"
				class:alert-error={toast.type == 'error'}
				class:alert-success={toast.type == 'success'}
				class:alert-warning={toast.type == 'warning'}
				class:alert-info={toast.type == 'info'}
			>
				{#if toast.type === 'info'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="h-6 w-6 shrink-0 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						></path>
					</svg>
				{:else if toast.type === 'success'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				{:else if toast.type === 'warning'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				{:else if toast.type === 'error'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				{/if}

				<span class="flex-1">{toast.message}</span>

				<button
					class="btn btn-circle btn-ghost btn-sm"
					onclick={() => toastManager.removeToast(toast)}
					aria-label="Dismiss"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>

				<!-- Progress bar -->
				<div
					class="absolute bottom-0 left-0 h-1 bg-current opacity-30 transition-all duration-[var(--duration)] ease-linear"
					style="width: 0%; --duration: {toastManager.timeout}ms; animation: shrink {toastManager.timeout}ms linear forwards;"
				></div>
			</div>
		</div>
	{/each}
{/if}

<style>
	@keyframes shrink {
		from {
			width: 100%;
		}
		to {
			width: 0%;
		}
	}
</style>
