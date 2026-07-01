import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import EmptyState from './EmptyState.svelte';
import ErrorState from './ErrorState.svelte';
import Skeleton from './Skeleton.svelte';

describe('shared components', () => {
	it('renders empty-state copy', () => {
		const { body } = render(EmptyState, { props: { title: 'Nothing here', description: 'Try later' } });
		expect(body).toContain('Nothing here');
		expect(body).toContain('Try later');
	});

	it('renders error fallback and optional retry button', () => {
		const { body } = render(ErrorState, { props: { error: new Error('Broken'), showRetry: true } });
		expect(body).toContain('Something went wrong');
		expect(body).toContain('Broken');
		expect(body).toContain('Try Again');
	});

	it('renders requested skeleton rows', () => {
		const { body } = render(Skeleton, { props: { type: 'text', rows: 3 } });
		expect(body.match(/class="skeleton/g)?.length).toBe(3);
	});
});
