import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
    {
        files: ['**/*.{js,mjs,cjs,ts}'],
        settings: {
            'import/resolver': {
                typescript: {},
            },
        },
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: globals.node,
        },
        plugins: {
            prettier: prettierPlugin,
            '@typescript-eslint': tseslint,
        },
        rules: {
            'prettier/prettier': 'error',
            'no-console': 'warn',
            '@typescript-eslint/no-unused-vars': ['error'],
        },
    },
    pluginJs.configs.recommended,
    tseslint.configs.recommended,
    prettierConfig,
];
