<script>
	import PageCard from '$lib/components/PageCard.svelte';
	import ThemeController from '$lib/components/ThemeController.svelte';
</script>

<PageCard scroll={false}>
	<div class="flex flex-col gap-4">
		<div>Theme</div>
		<ThemeController />
	</div>
</PageCard>
