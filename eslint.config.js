import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'node_modules', 'playwright-report', 'coverage'] },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        crypto: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
        TextEncoder: 'readonly',
        Uint8Array: 'readonly',
        FileReader: 'readonly',
        Math: 'readonly',
        Date: 'readonly',
        JSON: 'readonly',
        Promise: 'readonly',
        fetch: 'readonly',
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: { react: { version: '18' } },
    rules: {
      // React
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',   // Not needed with new JSX transform
      'react/prop-types': 'off',            // No TypeScript; skip prop-types
      'react/display-name': 'warn',

      // Hooks — catches missing deps in useEffect
      ...reactHooks.configs.recommended.rules,

      // Refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // General
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
    },
  },
  // Relax rules for test files
  {
    files: ['src/**/*.{test,spec}.{js,jsx}', 'src/test/**'],
    rules: {
      'no-console': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
];
