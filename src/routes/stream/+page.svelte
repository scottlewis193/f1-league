<script lang="ts">
	import { onMount } from 'svelte';

	let stream = $state('DAD');
	let provider = $state('dlhd');
	let src = $state('');

	let dlhdStreams = ['stream', 'cast', 'watch', 'plus', 'casting', 'player'];
	let ihatestreamsStreams = [
		'1a0edc01-8363-11f0-b385-bc2411b21e0d',
		'33a602e1-bbdc-11f0-93c8-bc2411e5e61b',
		'5fbdbab5-3cda-11f0-afb1-ecf4bbdafde4',
		'731265e4-7ff0-11f0-b385-bc2411b21e0d',
		'cb3927ff-80e1-11f0-b385-bc2411b21e0d'
	];

	onMount(() => {
		stream = localStorage.getItem('stream') ? (stream = localStorage.getItem('stream')!) : 'stream';
		provider = localStorage.getItem('provider')
			? (provider = localStorage.getItem('provider')!)
			: 'dlhd';
	});

	$effect(() => {
		if (provider == 'dlhd') {
			src = `https://dlhd.dad/${stream}/stream-60.php`;
		} else if (provider == 'ihatestreams') {
			src = `https://ihatestreams.xyz/embed/${stream}`;
		}
	});
</script>

<div class="box-border flex h-[calc(100vh-5rem)] w-full flex-col items-center gap-4 p-4">
	<div class="h-[calc(100vh-18rem)] w-[min(100vw,100vh)]">
		<div class="card aspect-video w-full bg-base-100 p-2">
			{#key stream}
				{#if stream == 'player' || stream == 'plus'}
					<iframe
						id="video"
						title="Stream"
						class="h-full w-full border-0"
						{src}
						frameborder="0"
						marginwidth="0"
						marginheight="0"
						allowfullscreen
						loading="lazy"
						sandbox="allow-scripts"
					></iframe>
				{:else}
					<iframe
						id="video"
						title="Stream"
						class="h-full w-full border-0"
						{src}
						frameborder="0"
						marginwidth="0"
						marginheight="0"
						allowfullscreen
						loading="lazy"
					></iframe>
				{/if}
			{/key}
		</div>
	</div>
	<select class="select" bind:value={provider}>
		<option value="dlhd">DLHD</option>
		<!-- <option value="ihatestreams">iHateStreams</option> -->
	</select>
	<!-- Buttons -->
	<div class="flex w-full max-w-6xl flex-wrap items-center justify-center gap-4">
		{#if provider == 'dlhd'}
			{#each dlhdStreams as _stream, index (index)}
				<button
					class="btn btn-primary"
					onclick={() => {
						stream = _stream;
						localStorage.setItem('stream', _stream.toString());
					}}
				>
					{_stream}
				</button>
			{/each}
		{/if}
		{#if provider == 'ihatestreams'}
			{#each ihatestreamsStreams as _stream, index (index)}
				<button
					class="btn btn-primary"
					onclick={() => {
						stream = _stream;
						localStorage.setItem('stream', _stream.toString());
					}}
				>
					{_stream}
				</button>
			{/each}
		{/if}
	</div>
	<p class="text-center">
		uBlock Origin recommended. Plus and player streams are ad-free so those use those on mobile.
	</p>
</div>
