<!-- light, dark, cupcake, bumblebee, emerald, corporate, synthwave, retro, cyberpunk,
valentine, halloween, garden, forest, aqua, lofi, pastel, fantasy, wireframe, black,
luxury, dracula, cmyk, autumn, business, acid, lemonade, night, coffee, winter, dim,
nord, sunset, caramellatte, abyss, silk
 -->

<script lang="ts">
	import { onMount } from 'svelte';

	let _theme = $state('dark');

	const themes = [
		'light',
		'dark',
		'cupcake',
		'bumblebee',
		'emerald',
		'corporate',
		'synthwave',
		'retro',
		'cyberpunk',
		'valentine',
		'halloween',
		'garden',
		'forest',
		'aqua',
		'lofi',
		'pastel',
		'fantasy',
		'wireframe',
		'black',
		'luxury',
		'dracula',
		'cmyk',
		'autumn',
		'business',
		'acid',
		'lemonade',
		'night',
		'coffee',
		'winter',
		'dim',
		'nord',
		'sunset',
		'caramellatte',
		'abyss',
		'silk'
	];

	const setTheme = (theme: string) => {
		localStorage.setItem('theme', theme);
		document.startViewTransition(() => {
			document.documentElement.setAttribute('data-theme', theme);
			_theme = theme;
			const activeElement = document.activeElement as HTMLElement;

			//set theme color (status bar on mobile devices) from base color variable
			const barColor = window.getComputedStyle(document.body).getPropertyValue('--color-base-300');
			const themeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
			if (themeColor) themeColor.content = barColor;

			activeElement.blur();
		});
	};

	onMount(() => {
		_theme = localStorage.getItem('theme') || 'dark';
	});

	$effect(() => {
		document.documentElement.setAttribute('data-theme', _theme);
	});
</script>

<div class="dropdown">
	<div tabindex="0" role="button" class="btn w-52">
		{_theme}
		<svg
			width="12px"
			height="12px"
			class="inline-block h-2 w-2 fill-current opacity-60"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 2048 2048"
		>
			<path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
		</svg>
	</div>
	<ul
		id="theme-dropdown"
		tabindex="0"
		class="dropdown-content z-1 h-52 w-52 overflow-y-auto rounded-box bg-base-300 p-2 shadow-2xl"
	>
		{#each themes as theme}
			<li>
				<input
					type="radio"
					name="theme-dropdown"
					class=" btn w-full justify-start btn-ghost"
					aria-label={theme}
					value={theme}
					onchange={(e) => setTheme(e.currentTarget.value)}
				/>
			</li>
		{/each}
	</ul>
</div>
