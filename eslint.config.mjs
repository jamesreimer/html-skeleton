import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', '.venv/**'] },
  js.configs.recommended,
  {
    files: ['**/*.mjs', '**/*.cjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['assets/js/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
];
