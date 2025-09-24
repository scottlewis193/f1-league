<script>
	import { fade } from 'svelte/transition';
</script>

<div in:fade class="card h-full w-full overflow-auto bg-base-100">
	<div class="card-body">
		<div class="flex flex-col gap-2">
			<p class="text-2xl">Objective</p>
			<p>Predict the top 3 drivers at the end of each race</p>
			<br />
			<p class="text-2xl">Predictions</p>
			<p>Predictions submissions close at the start of FP1</p>
			<p>You can change them at any time between these times</p>
			<br />
			<p class="text-2xl">Scoring</p>
			<p>Driver in the top 3: Rounded Driver Odds * 1</p>
			<p>Exact finishing position: Rounded Driver Odds * 3</p>
		</div>
	</div>
</div>
