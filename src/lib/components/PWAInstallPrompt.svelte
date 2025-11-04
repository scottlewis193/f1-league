<script lang="ts">
	import { onMount } from 'svelte';

	let deferredPrompt: any = null;
	let showPrompt = $state(false);
	let isInstalled = $state(false);
	let isIOS = $state(false);
	let showIOSInstructions = $state(false);

	onMount(() => {
		// Check if already installed
		if (window.matchMedia('(display-mode: standalone)').matches) {
			isInstalled = true;
			return;
		}

		// Check if iOS
		const userAgent = window.navigator.userAgent.toLowerCase();
		isIOS = /iphone|ipad|ipod/.test(userAgent);

		// Check if user has dismissed before
		const dismissed = localStorage.getItem('pwa-install-dismissed');
		if (dismissed) {
			const dismissedDate = new Date(dismissed);
			const now = new Date();
			const daysSinceDismissed = Math.floor(
				(now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
			);

			// Show again after 7 days
			if (daysSinceDismissed < 7) {
				return;
			}
		}

		// Listen for beforeinstallprompt event (non-iOS)
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			showPrompt = true;
		});

		// For iOS, show after a delay if not installed
		if (isIOS && !isInstalled) {
			setTimeout(() => {
				showPrompt = true;
			}, 3000);
		}
	});

	async function handleInstall() {
		if (isIOS) {
			showIOSInstructions = true;
			return;
		}

		if (!deferredPrompt) return;

		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;

		if (outcome === 'accepted') {
			console.log('User accepted the install prompt');
		}

		deferredPrompt = null;
		showPrompt = false;
	}

	function handleDismiss() {
		showPrompt = false;
		showIOSInstructions = false;
		localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
	}
</script>

{#if showPrompt && !isInstalled}
	<div class="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
		<div class="alert shadow-lg bg-base-100 border border-base-content/10">
			<div class="flex w-full flex-col gap-2">
				<div class="flex items-start justify-between gap-2">
					<div class="flex items-center gap-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 flex-shrink-0 text-primary"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
							/>
						</svg>
						<div>
							<h3 class="font-bold">Install F1 League</h3>
							<p class="text-sm opacity-70">Get quick access and offline support</p>
						</div>
					</div>
					<button
						class="btn btn-circle btn-ghost btn-sm"
						onclick={handleDismiss}
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
				</div>
				<div class="flex gap-2">
					<button class="btn btn-primary btn-sm flex-1" onclick={handleInstall}>Install</button>
					<button class="btn btn-ghost btn-sm" onclick={handleDismiss}>Not Now</button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showIOSInstructions}
	<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm">
		<div class="w-full max-w-md rounded-t-3xl bg-base-100 p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-bold">Install F1 League</h3>
				<button
					class="btn btn-circle btn-ghost btn-sm"
					onclick={handleDismiss}
					aria-label="Close"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
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
			</div>

			<div class="flex flex-col gap-4 text-sm">
				<p class="opacity-70">To install this app on your iOS device:</p>

				<div class="flex items-start gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
						1
					</div>
					<div class="flex-1">
						<p>
							Tap the <strong>Share</strong> button
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="inline-block h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
								/>
							</svg>
							in your browser toolbar
						</p>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
						2
					</div>
					<div class="flex-1">
						<p>Scroll down and tap <strong>"Add to Home Screen"</strong></p>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
						3
					</div>
					<div class="flex-1">
						<p>Tap <strong>"Add"</strong> in the top right corner</p>
					</div>
				</div>
			</div>

			<button class="btn btn-primary btn-block mt-6" onclick={handleDismiss}>Got it!</button>
		</div>
	</div>
{/if}
