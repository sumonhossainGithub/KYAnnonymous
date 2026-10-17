import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: 'Direct HTML injection (dangerouslySetInnerHTML) is strictly forbidden for security & privacy policy (§42).',
        },
      ],
    },
  },
  {
    ignores: ['vendor/**', 'node_modules/**', 'public/**', 'bootstrap/ssr/**'],
  }
);
