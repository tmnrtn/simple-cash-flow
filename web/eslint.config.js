const js = require('@eslint/js');
const globals = require('globals');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const prettier = require('eslint-config-prettier');

module.exports = [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // New JSX transform: React need not be in scope, and we don't use prop-types.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  // Build/config files run in Node, not the browser.
  {
    files: ['*.config.js', 'vite.config.js', 'postcss.config.js', 'tailwind.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  // Vitest test files.
  {
    files: ['**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
];
