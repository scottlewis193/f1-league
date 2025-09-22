<script>
	import Select from '$lib/components/Select.svelte';
	import ThemeController from '$lib/components/ThemeController.svelte';
	import { fade } from 'svelte/transition';
</script>

<div in:fade class="card h-full w-full bg-base-100">
	<div class="card-body">
		<div class="flex flex-col gap-4">
			<div>Theme</div>
			<ThemeController />
		</div>
	</div>
</div>
