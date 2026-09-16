import { readdirSync } from 'node:fs'
import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import checkFile from 'eslint-plugin-check-file'
import { createNodeResolver, importX } from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Naming patterns (.ai/ARCHITECTURE.md → "File name postfixes")
const CAMEL_CASE = '+([a-z])*([a-z0-9])*([A-Z]*([a-z0-9]))'
const PASCAL_CASE = '*([A-Z]*([a-z0-9]))'
const POSTFIX = '@(hook|util|type|enum|const|init|service|api|atom|schema)'
const POSTFIX_FILE = `${CAMEL_CASE}.${POSTFIX}?(.test)`
const COMPONENT_FILE = `${PASCAL_CASE}?(.test)`

const PLAYWRIGHT_RESTRICTION = {
  name: '@playwright/test',
  message: 'Playwright belongs to e2e/ only.',
}

// Renderer boundary (.ai/PROJECT-CONTEXT.md → "The renderer boundary"):
// a prohibition by layer, not a list of permitted folders
const MAPLIBRE_RESTRICTION = {
  group: ['maplibre-gl', 'maplibre-gl/*'],
  message:
    'maplibre-gl must not be imported in application/api/, shared/, or any utils/, schemas/ or types/ folder — these layers deal in domain objects and GeoJSON.',
}
const MAPLIBRE_FORBIDDEN_FILES = [
  'src/application/api/**/*.{ts,tsx}',
  'src/shared/**/*.{ts,tsx}',
  'src/**/utils/**/*.{ts,tsx}',
  'src/**/schemas/**/*.{ts,tsx}',
  'src/**/types/**/*.{ts,tsx}',
]

// features/A must not import from features/B
const featureZones = readdirSync('src/features', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map(({ name }) => ({
    target: `./src/features/${name}`,
    from: './src/features',
    except: [`./${name}`],
    message: 'Cross-feature imports are not allowed.',
  }))

// .ai/ARCHITECTURE.md → "Import names": no `as` aliases in named imports
const noImportAlias = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      alias: 'Do not alias imports with `as` — fix the name instead.',
    },
  },
  create: (context) => ({
    ImportSpecifier(node) {
      const importedName =
        node.imported.type === 'Identifier'
          ? node.imported.name
          : node.imported.value
      if (importedName !== node.local.name) {
        context.report({ node, messageId: 'alias' })
      }
    },
  }),
}

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-x': importX,
      local: { rules: { 'no-import-alias': noImportAlias } },
    },
    settings: {
      'import-x/extensions': ['.ts', '.tsx', '.js'],
      'import-x/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
      'import-x/resolver-next': [
        createNodeResolver({ extensions: ['.ts', '.tsx', '.js', '.json'] }),
      ],
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeAlias', format: ['PascalCase'], suffix: ['T'] },
        { selector: 'enum', format: ['PascalCase'], suffix: ['E'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
      ],
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            'React.FC': 'Type props directly in function arguments.',
            'React.FunctionComponent':
              'Type props directly in function arguments.',
            FC: 'Type props directly in function arguments.',
            FunctionComponent: 'Type props directly in function arguments.',
          },
        },
      ],
      'import-x/no-cycle': 'error',
      'local/no-import-alias': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite()],
    languageOptions: { globals: globals.browser },
    plugins: { 'check-file': checkFile },
    rules: {
      'no-restricted-imports': ['error', { paths: [PLAYWRIGHT_RESTRICTION] }],
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/shared',
              from: './src/features',
              message: 'shared/ must not import from features/.',
            },
            ...featureZones,
          ],
        },
      ],
      'check-file/folder-naming-convention': [
        'error',
        { 'src/**/': 'KEBAB_CASE' },
      ],
      'check-file/filename-naming-convention': [
        'error',
        {
          'src/*.tsx': '@(main)',
          'src/*/**/*.tsx': `@(${COMPONENT_FILE}|${POSTFIX_FILE})`,
          'src/**/*.ts': POSTFIX_FILE,
        },
        {
          errorMessage:
            'File "{{ target }}" must be a PascalCase component or camelCase with an allowed postfix (.hook, .util, .type, .enum, .const, .init, .service, .api, .atom, .schema), optionally followed by .test',
        },
      ],
      // Location-restricted postfixes: .init only in application/, .api only in application/api/
      'check-file/filename-blocklist': [
        'error',
        {
          'src/*.init.*': 'application/',
          'src/!(application)/**/*.init.*': 'application/',
          'src/*.api.*': 'application/api/',
          'src/!(application)/**/*.api.*': 'application/api/',
          'src/application/*.api.*': 'application/api/',
          'src/application/!(api)/**/*.api.*': 'application/api/',
        },
        {
          errorMessage:
            'File "{{ target }}" is in the wrong layer: .init belongs only in application/, .api only in application/api/',
        },
      ],
    },
  },
  {
    // Rule options are replaced, not merged, so the Playwright restriction is repeated
    files: MAPLIBRE_FORBIDDEN_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [PLAYWRIGHT_RESTRICTION], patterns: [MAPLIBRE_RESTRICTION] },
      ],
    },
  },
  {
    // Vite env typing relies on interface declaration merging: https://vite.dev/guide/env-and-mode
    files: ['src/vite-env.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      'check-file/filename-naming-convention': 'off',
    },
  },
  eslintConfigPrettier,
  // Re-enabled after eslint-config-prettier: no single-line ifs
  { rules: { curly: ['error', 'all'] } },
])
