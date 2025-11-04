<script lang="ts">
	type SkeletonType = 'text' | 'avatar' | 'card' | 'table-row' | 'button' | 'input';

	let {
		type = 'text',
		rows = 1,
		class: className = '',
		width = '100%',
		height = 'auto'
	}: {
		type?: SkeletonType;
		rows?: number;
		class?: string;
		width?: string;
		height?: string;
	} = $props();
</script>

{#if type === 'text'}
	{#each Array(rows) as _, i}
		<div
			class="skeleton mb-2 h-4 {className}"
			style="width: {i === rows - 1 && rows > 1 ? '80%' : width}; height: {height === 'auto' ? '1rem' : height}"
		></div>
	{/each}
{:else if type === 'avatar'}
	<div
		class="skeleton rounded-box {className}"
		style="width: {width}; height: {height === 'auto' ? width : height}"
	></div>
{:else if type === 'card'}
	<div class="card bg-base-100 {className}">
		<div class="card-body">
			<div class="skeleton mb-4 h-6 w-2/3"></div>
			<div class="skeleton mb-2 h-4 w-full"></div>
			<div class="skeleton mb-2 h-4 w-full"></div>
			<div class="skeleton h-4 w-4/5"></div>
		</div>
	</div>
{:else if type === 'table-row'}
	<tr class={className}>
		<td><div class="skeleton h-4 w-full"></div></td>
		<td><div class="skeleton h-4 w-3/4"></div></td>
		<td><div class="skeleton h-4 w-1/2"></div></td>
		<td><div class="skeleton h-4 w-1/2"></div></td>
	</tr>
{:else if type === 'button'}
	<div class="skeleton rounded-btn {className}" style="width: {width}; height: {height === 'auto' ? '3rem' : height}"></div>
{:else if type === 'input'}
	<div class="skeleton rounded-box h-12 {className}" style="width: {width}"></div>
{/if}

<style>
	.skeleton {
		background: linear-gradient(90deg, hsl(var(--b2)) 25%, hsl(var(--b3)) 50%, hsl(var(--b2)) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
