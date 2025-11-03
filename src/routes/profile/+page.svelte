<script lang="ts">
	import { getCurrentPlayerWithStats, updatePlayerProfile } from '$lib/remote/players.remote';
	import { getToastManagerContext } from '$lib/stores/toastmanager.svelte';
	import { fade } from 'svelte/transition';

	let oldPasswordEl: HTMLInputElement;
	let passwordEl: HTMLInputElement;
	let confirmPasswordEl: HTMLInputElement;
	let fileName: string = $state('');
	const currentPlayerQuery = getCurrentPlayerWithStats();
	const toastManager = getToastManagerContext();

	function validateConfirmPassword() {
		if (!passwordEl) {
			confirmPasswordEl.setCustomValidity('');
			return;
		}

		if (passwordEl.value != confirmPasswordEl.value) {
			confirmPasswordEl.setCustomValidity("Passwords Don't Match");
		} else {
			confirmPasswordEl.setCustomValidity('');
		}

		if (passwordEl.value.length < 8) {
			passwordEl.setCustomValidity('Password must be at least 8 characters');
		}
	}

	function validateFileSize(event: Event) {
		const fileInput = event.target as HTMLInputElement;
		const file = fileInput.files?.[0];
		if (!file) return;

		if (file.size > 5 * 1024 * 1024) {
			fileInput.setCustomValidity('File size must be less than 5MB');
		} else {
			fileInput.setCustomValidity('');
		}
	}
</script>

{#if currentPlayerQuery.ready}
	{@const player = currentPlayerQuery.current}
	<div in:fade class="card h-full w-full bg-base-100">
		<div class="card-body w-full">
			<form
				id="profile-form"
				class="flex flex-col gap-4"
				{...updatePlayerProfile.enhance(async ({ submit }) => {
					try {
						await submit().updates(getCurrentPlayerWithStats());
						toastManager.addToast('Profile updated successfully', 'success');
					} catch (error) {
						toastManager.addToast('Failed to update profile', 'error');
					}
				})}
				enctype="multipart/form-data"
			>
				<div>Name</div>
				<input
					type="text"
					name="name"
					value={player?.name}
					placeholder="Name"
					class="input w-full"
					maxlength="25"
				/>

				<div>Email</div>
				<input
					type="email"
					placeholder="Email"
					name="email"
					class="input w-full"
					value={player?.email}
				/>

				<div>Current Password</div>
				<input
					type="password"
					placeholder="Current Password"
					name="oldPassword"
					class="input w-full"
					bind:this={oldPasswordEl}
				/>

				<div>Password</div>
				<input
					type="password"
					placeholder="New Password"
					name="password"
					class="input w-full"
					bind:this={passwordEl}
				/>

				<div>Password Confirm</div>
				<input
					type="password"
					placeholder="Confirm Password"
					name="passwordConfirm"
					class="input w-full"
					bind:this={confirmPasswordEl}
					onchange={validateConfirmPassword}
					onkeyup={validateConfirmPassword}
				/>
				<div>Avatar (Max 5MB)</div>

				<input
					id="files"
					class="file-input hidden w-full"
					type="file"
					accept="image/png, image/jpeg, image/webp"
					name="avatar"
					onchange={validateFileSize}
					bind:value={fileName}
				/>
				<div class="join">
					<label for="files" class="btn join-item">Choose image</label>

					<input
						type="text"
						class="input join-item mt-px w-full"
						value={fileName.split('\\').pop()}
						placeholder="No image chosen"
					/>
				</div>
			</form>
		</div>
	</div>
	<button type="submit" form="profile-form" class="btn btn-primary">Save Changes</button>
{/if}
