<script lang="ts">
	import Hls from 'hls.js/dist/hls.js';
	import { onMount } from 'svelte';

	let streamNo = $state(1);

	onMount(() => {
		streamNo = localStorage.getItem('streamNo')
			? (streamNo = parseInt(localStorage.getItem('streamNo')!))
			: 1;
	});

	$effect(() => {
		if (streamNo == 3) {
			const video = document.getElementById('video') as HTMLVideoElement;
			if (!video) return;
			if (Hls.isSupported()) {
				const hls = new Hls();
				hls.loadSource('http://192.168.0.2:8083/hls/stream.m3u8');
				hls.attachMedia(video);
				hls.on(Hls.Events.MANIFEST_PARSED, function () {
					video?.play();
				});
			} else {
				video.src = 'http://192.168.0.2:8083/hls/stream.m3u8';
			}
		}
	});
</script>

<div class="box-border flex min-h-[calc(100vh-5rem)] w-full flex-col items-center gap-4 p-4">
	<!-- Video Card -->
	<div
		class="card flex w-full max-w-6xl flex-1 flex-col items-center justify-center bg-base-100 p-4"
	>
		<!-- Responsive 16:9 Iframe -->
		<div
			class="aspect-video h-auto w-full overflow-hidden rounded-lg"
			style="max-height: calc(100vh - 160px);"
		>
			{#if streamNo == 3}
				<video id="video" controls autoplay></video>
			{:else}
				<iframe
					id="video"
					title="Stream"
					class="h-full w-full border-0"
					src={streamNo == 1
						? 'https://dlhd.dad/player/stream-60.php'
						: 'https://dlhd.dad/plus/stream-60.php'}
					scrolling="no"
					frameborder="0"
					marginwidth="0"
					marginheight="0"
					allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
				></iframe>
			{/if}

			<!-- <video
				data-html5-video=""
				preload="metadata"
				src="blob:https://ppv.to/5f786dd3-e6c1-4946-8fac-a6c35dab2714"
				><style class="clappr-style">
					[data-html5-video] {
						position: absolute;
						height: 100%;
						width: 100%;
						display: block;
					}
				</style></video
			> -->

			<!-- <iframe
				class="video"
				src="https://vod.rerace.io/live/mgjgghfgncfgngcgfgeg?id=cgfgjgog"
				width="100%"
				height="100%"
				frameborder="0"
				allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
				allowfullscreen=""
			></iframe> -->
		</div>
	</div>

	<!-- Buttons -->
	<div class="flex w-full max-w-6xl flex-wrap items-center justify-center gap-4">
		{#each [1, 2, 3] as n, index (index)}
			<button
				class="btn btn-primary"
				onclick={() => {
					streamNo = n;
					localStorage.setItem('streamNo', n.toString());
				}}
			>
				{n}
			</button>
		{/each}
	</div>
</div>
