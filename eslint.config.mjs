import eslint from '@eslint/js'
import typescriptEslint from 'typescript-eslint'
import eslintPluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['.vite/**', 'out/**']
  },
  ...typescriptEslint.config(
    {
      extends: [
        eslint.configs.recommended,
        ...typescriptEslint.configs.recommended,
        ...eslintPluginVue.configs['flat/recommended']
      ],
      files: ['**/*.{ts,vue}'],
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: {
          parser: typescriptEslint.parser
        }
      },
      rules: {
        'no-empty': ['error', { allowEmptyCatch: true }],
        '@typescript-eslint/ban-ts-comment': ['off'],
        '@typescript-eslint/no-this-alias': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': 'warn',
        'vue/multi-word-component-names': 'off'
      }
    },
    eslintConfigPrettier
  )
]
