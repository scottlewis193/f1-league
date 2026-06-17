<script lang="ts">
	import { login, register } from '$lib/remote/players.remote';
	import { BackIcon } from '$lib/components/icons';
	import { PASSWORD_MIN_LENGTH } from '$lib/config';

	// svelte-ignore non_reactive_update
	let loginForm: HTMLFormElement;
	// svelte-ignore non_reactive_update
	let registerForm: HTMLFormElement;
	// svelte-ignore non_reactive_update
	let password: HTMLInputElement;
	// svelte-ignore non_reactive_update
	let confirmPassword: HTMLInputElement;

	let error = '';
	let loading = $state(false);

	let pageState: 'start' | 'login' | 'register' = $state('start');

	function validateConfirmPassword() {
		if (!password) {
			confirmPassword.setCustomValidity('');
			return;
		}

		if (password.value !== confirmPassword.value) {
			confirmPassword.setCustomValidity("Passwords Don't Match");
		} else {
			confirmPassword.setCustomValidity('');
		}

		if (password.value.length < PASSWORD_MIN_LENGTH) {
			password.setCustomValidity(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
		}
	}
</script>

<div class="flex h-full flex-col items-center gap-4 p-4">
	{#if pageState === 'start'}
		<div class="flex h-full items-center justify-center">
			<img src="/logo.png" alt="F1 League logo" class="size-80 object-contain" />

			<!-- <img src="/logo.png" alt="Logo" class="size-90" /> -->
		</div>

		<div class="flex w-full flex-col justify-end gap-4 lg:max-w-96">
			<button class="btn btn-lg btn-primary" onclick={() => (pageState = 'login')}>Login</button>
			<button class="btn btn-lg btn-secondary" onclick={() => (pageState = 'register')}
				>Register</button
			>
		</div>
	{:else if pageState === 'login'}
		<div class="flex h-16 w-full items-center justify-start gap-4 p-4">
			<button
				type="button"
				class="btn btn-square btn-ghost"
				aria-label="Back to start"
				onclick={() => (pageState = 'start')}
			>
				<BackIcon />
			</button>
		</div>

		{#if error}
			<div class="mt-2 alert alert-error">
				<span>{error}</span>
			</div>
		{/if}

		<form
			{...login}
			id="login-form"
			class="flex h-full w-full flex-col items-center justify-center gap-4"
			bind:this={loginForm}
			method="post"
		>
			<div class="text-center text-3xl">Sign In</div>
			<input name="email" class="input input-lg" type="email" required placeholder="Email" />

			<input
				name="password"
				type="password"
				class="input input-lg"
				required
				placeholder="Password"
				onkeypress={(e) => {
					if (e.key !== 'Enter') return;
					loading = true;
					loginForm.submit();
				}}
			/>
		</form>
		<div class="flex h-16 w-full flex-col gap-4 lg:max-w-96">
			<button
				onclick={() => {
					loading = true;
					loginForm.submit();
				}}
				class="btn w-full btn-lg btn-primary lg:max-w-96"
				type="button"
				disabled={loading}
			>
				{loading ? 'Logging in...' : 'Login'}
			</button>
		</div>
	{:else if pageState === 'register'}
		<div class="flex h-16 w-full items-center justify-start gap-4 p-4">
			<button
				type="button"
				class="btn btn-square btn-ghost"
				aria-label="Back to start"
				onclick={() => (pageState = 'start')}
			>
				<BackIcon />
			</button>
		</div>
		<form
			{...register}
			id="register-form"
			bind:this={registerForm}
			class="flex h-full w-full flex-col items-center justify-center gap-4"
			method="post"
		>
			<div class="text-center text-3xl">Sign Up</div>

			<input name="name" class="input input-lg" type="text" required placeholder="Username" />

			<input name="email" class="input input-lg" type="email" required placeholder="Email" />

			<input
				name="password"
				type="password"
				class="input input-lg"
				required
				placeholder="Password"
				bind:this={password}
			/>

			<input
				name="passwordConfirm"
				type="password"
				class="input input-lg"
				required
				placeholder="Confirm Password"
				bind:this={confirmPassword}
				onchange={validateConfirmPassword}
				onkeyup={validateConfirmPassword}
			/>
		</form>
		<button
			form="register-form"
			onclick={() => {
				loading = true;
				registerForm.submit();
			}}
			class="btn w-full btn-lg btn-primary lg:max-w-96"
			type="submit"
			disabled={loading}
		>
			{loading ? 'Registering...' : 'Register'}
		</button>
	{/if}
</div>
