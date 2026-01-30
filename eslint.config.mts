import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        plugins: { js },
        extends: ['js/recommended'],
        languageOptions: {
            globals: {...globals.node}
        },
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            sourceType: 'commonjs'
        }
    },
    tseslint.configs.recommended,
    {
        rules: {
            indent: ['error', 4],
            semi: ['error', 'always'],
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', {
                'destructuredArrayIgnorePattern': '^_',
                'varsIgnorePattern': '^_',
                'argsIgnorePattern': '^_'
            }],
            quotes: ['error', 'single'],
        },
    }
]);
