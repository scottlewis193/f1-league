<script lang="ts">
	import { getCurrentPlayerWithStats, updatePlayerProfile } from '$lib/remote/players.remote';
	import { fade } from 'svelte/transition';

	let oldPassword: HTMLInputElement;
	let password: HTMLInputElement;
	let confirmPassword: HTMLInputElement;

	const currentPlayerQuery = getCurrentPlayerWithStats();

	function validateConfirmPassword() {
		if (!password) {
			confirmPassword.setCustomValidity('');
			return;
		}

		if (password.value != confirmPassword.value) {
			confirmPassword.setCustomValidity("Passwords Don't Match");
		} else {
			confirmPassword.setCustomValidity('');
		}

		if (password.value.length < 8) {
			password.setCustomValidity('Password must be at least 8 characters');
		}
	}
</script>

{#if currentPlayerQuery.ready}
	{@const player = currentPlayerQuery.current}
	<div in:fade class="card h-full w-full bg-base-100">
		<div class="card-body w-full">
			<form id="profile-form" class="flex flex-col gap-4" {...updatePlayerProfile}>
				<div>Name</div>
				<input
					type="text"
					placeholder="Name"
					name="name"
					class="input w-full"
					maxlength="25"
					value={player?.name}
				/>

				<div>Current Password</div>
				<input
					type="password"
					placeholder="Current Password"
					name="oldPassword"
					class="input w-full"
					bind:this={oldPassword}
				/>

				<div>Password</div>
				<input
					type="password"
					placeholder="New Password"
					name="password"
					class="input w-full"
					bind:this={password}
				/>

				<div>Password Confirm</div>
				<input
					type="password"
					placeholder="Confirm Password"
					name="passwordConfirm"
					class="input w-full"
					bind:this={confirmPassword}
					onchange={validateConfirmPassword}
					onkeyup={validateConfirmPassword}
				/>
			</form>
		</div>
	</div>
	<button type="submit" form="profile-form" class="btn btn-primary">Save Changes</button>
{/if}
