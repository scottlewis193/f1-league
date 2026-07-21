<script>
	import PageCard from '$lib/components/PageCard.svelte';
	import ThemeController from '$lib/components/ThemeController.svelte';
	import { resolve } from '$app/paths';
</script>

<PageCard scroll={false}>
	<div class="flex flex-col gap-4">
		<div>Theme</div>
		<ThemeController />
		<a href={resolve('/about')} class="btn btn-ghost justify-start">About</a>
	</div>
</PageCard>
