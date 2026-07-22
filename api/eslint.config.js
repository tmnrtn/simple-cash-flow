const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // Express handlers often leave req/next unused; don't flag those.
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
    },
  },
  // Test files use the built-in node:test runner and global fetch.
  {
    files: ['test/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: { ...globals.node, fetch: 'readonly' },
    },
  },
  prettier,
];
