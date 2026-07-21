<script lang="ts">
	import { fade } from 'svelte/transition';
	import pkg from '../../../package.json';

	const version = pkg.version;
</script>

<div in:fade class="card h-full w-full overflow-auto bg-base-100">
	<div class="card-body">
		<div class="flex flex-col gap-2">
			<p class="text-2xl">F1 League</p>
			<p class="text-sm opacity-70">Version {version}</p>
			<br />
			<p>Predict the top 3 drivers at the end of each race and compete for the top of the standings.</p>
		</div>
	</div>
</div>
