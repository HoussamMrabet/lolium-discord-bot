import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

/**
 * Flat ESLint config (ESLint v9+), ESM-native to match the project.
 * `eslint-config-prettier` is placed last so it disables any stylistic rules
 * that would fight Prettier — ESLint owns correctness, Prettier owns style.
 */
export default [
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**', 'logs/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': 'off',
      eqeqeq: ['error', 'smart'],
      'no-return-await': 'error',
      'require-await': 'warn',
    },
  },
  {
    files: ['test/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  prettier,
];
