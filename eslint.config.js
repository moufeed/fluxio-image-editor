// @ts-check
// Flat config (ESLint 9+) for the Angular 21 fluxio-image-editor workspace.

const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const boundaries = require('eslint-plugin-boundaries');

module.exports = tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.angular/**',
      '**/coverage/**',
      '**/out-tsc/**',
      '**/*.min.js',
      '**/*.d.ts',
      'playwright-report/**',
      'test-results/**',
      'e2e/**',
      'playwright.config.ts',
      'tools/**/*.ts',
      'eslint-report.json',
    ],
  },

  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'projects/fluxio-image-editor/core/**' },
        { type: 'plugins', pattern: 'projects/fluxio-image-editor/plugins/**' },
        { type: 'renderer', pattern: 'projects/fluxio-image-editor/renderer-fabric/**' },
        { type: 'shell', pattern: 'projects/fluxio-image-editor/src/**' },
        { type: 'testing', pattern: 'projects/fluxio-image-editor/testing/**' },
        { type: 'demo', pattern: 'projects/demo/**' },
        { type: 'docs', pattern: 'projects/docs/**' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'core' } },
              disallow: {
                to: {
                  element: {
                    types: { anyOf: ['plugins', 'renderer', 'shell', 'demo', 'docs'] },
                  },
                },
              },
            },
            {
              from: { element: { type: 'plugins' } },
              disallow: {
                to: {
                  element: { types: { anyOf: ['renderer', 'shell', 'demo', 'docs'] } },
                },
              },
            },
            {
              from: { element: { types: { anyOf: ['core', 'plugins'] } } },
              disallow: {
                to: { module: { origin: 'external', source: /^fabric(?:\/|$)/ } },
              },
            },
          ],
        },
      ],
    },
  },

  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: ['fluxio', 'app', 'docs'], style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['fluxio', 'app', 'docs'], style: 'kebab-case' },
      ],
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/no-empty-lifecycle-method': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-output-rename': 'error',
      // Public API uses names like `error` / `reset` / `cancel` — renaming would be breaking.
      '@angular-eslint/no-output-native': 'warn',

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],
    },
  },

  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/no-negated-async': 'error',
      '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }],
      '@angular-eslint/template/no-any': 'warn',
      // Chrome uses clickable icon rows; track as warnings until a focused a11y pass.
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
    },
  },

  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },

  {
    files: ['tools/**/*.{js,mjs,cjs}', '*.config.{js,cjs,mjs}', 'commitlint.config.js'],
    extends: [eslint.configs.recommended],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
  },
);
