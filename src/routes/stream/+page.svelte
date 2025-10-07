<script lang="ts">
	let streamNo = $state(1);
</script>

<div class="flex h-full w-full flex-col items-center gap-4 p-4">
	<div class="card h-full w-full items-center justify-center bg-base-100 p-4">
		<iframe
			sandbox="allow-forms allow-scripts"
			title="Stream 1"
			class=" h-[calc(100svh-12.5rem)] w-[calc(100svw-4rem)]"
			src={streamNo == 1
				? 'https://dlhd.dad/plus/stream-60.php'
				: streamNo == 2
					? 'https://dlhd.dad/stream/stream-60.php'
					: 'https://dlhd.dad/cast/stream-60.php'}
			marginheight="0"
			marginwidth="0"
			scrolling="no"
			allowfullscreen={true}
			allow="encrypted-media; picture-in-picture;"
			width="100%"
			height="100%"
			frameborder="0"
		></iframe>
	</div>

	<div class="flex w-full items-center justify-center gap-4">
		<button class="btn btn-primary" onclick={() => (streamNo = 1)}>Stream 1</button>
		<button class="btn btn-primary" onclick={() => (streamNo = 2)}>Stream 2</button>
		<button class="btn btn-primary" onclick={() => (streamNo = 3)}>Stream 3</button>
	</div>
</div>
