// ----------------------------------------------------------------------------------
//  Name:    eslint.config.js
//  Author:  Mark Casey
//
//  Purpose: ESLint flat config: recommended JS rules, React hooks rules and
//           eslint-plugin-security, with browser, Node and Worker globals.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import security from 'eslint-plugin-security'

// ── Config ────────────────────────────────────────────────
export default [
  { ignores: ['dist/', '.wrangler/', 'node_modules/'] },
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Flags every obj[key]. The only untrusted keys are group names, and
      // groupNameError() in server/lottery.js rejects prototype names.
      'security/detect-object-injection': 'off',
    },
  },
  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['worker/**/*.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
]
