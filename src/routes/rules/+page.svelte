<script>
	import { fade } from 'svelte/transition';
</script>

<div in:fade class="card h-full w-full overflow-auto bg-base-100">
	<div class="card-body">
		<p class="text-2xl">Objective</p>
		<p>Predict the top 3 drivers at the end of each race</p>
		<br />
		<p class="text-2xl">Prediction Submissions</p>
		<p>Predictions submissions close at the start of FP1</p>
		<p>You can change them at any time between these times</p>
		<br />
		<p class="text-2xl">Scoring</p>
		<p>Driver in the top 3: 1 point</p>
		<p>Exact finishing position: 3 points</p>
		<p>This means you can get a maximum of 12 points per race</p>
		<br />
		<p class="text-2xl">Examples</p>
		<p class="text-lg">Race Result</p>
		<p>Hamilton 1st, Verstappen 2nd, Norris 3rd</p>
		<p class="text-lg">Prediction</p>
		<p>Norris 1st, Leclerc 2nd, Hamilton 3rd</p>
		<p class="text-lg">Points Awarded</p>
		<p>1 (Place) + 0 + 1 (Place) = 2</p>
		<br />
		<p class="text-lg">Race Result</p>
		<p>Hamilton 1st, Verstappen 2nd, Norris 3rd</p>
		<p class="text-lg">Prediction</p>
		<p>Hamilton 1st, Norris 2nd, Verstappten 3rd</p>
		<p class="text-lg">Points Awarded</p>
		<p>4 (Place + Exact) + 1 (Place) + 1 (Place) = 6</p>
	</div>
</div>
