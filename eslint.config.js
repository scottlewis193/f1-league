import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';

export default tseslint.config(
	{
		ignores: [
			'node_modules/**',
			'.svelte-kit/**',
			'.cache/**',
			'build/**',
			'dist/**',
			'dev-dist/**',
			'app/build/**',
			'coverage/**',
			'.puppeteerrc.cjs'
		]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		},
		rules: {
			'no-console': 'off',
			'no-undef': 'off',
			'no-useless-assignment': 'off',
			'prefer-const': 'off',
			'svelte/no-dom-manipulating': 'off',
			'svelte/require-each-key': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser
			}
		}
	},
	{
		files: ['**/*.svelte.ts'],
		languageOptions: {
			parser: tseslint.parser
		}
	}
);
