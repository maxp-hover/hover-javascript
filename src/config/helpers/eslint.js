const {rules} = require('eslint-config-airbnb-typescript/lib/shared')

const {hasAnyDep} = require('../../utils')
const {testMatch} = require('../jest.config')

const withBaseConfig = base => variant =>
  require.resolve(base + (variant ? `/${variant}` : ''))

const airbnb = withBaseConfig('eslint-config-airbnb-typescript')
const prettier = withBaseConfig('eslint-config-prettier')

const hasReact = hasAnyDep('react')

const parserRules = (typescript = false, react = false) => {
  const isOff = off => (off ? 'off' : 'error')

  const propTypes = react ? {'react/prop-types': isOff(typescript)} : {}

  return {
    'no-implied-eval': isOff(typescript),
    'no-throw-literal': isOff(typescript),
    '@typescript-eslint/no-implied-eval': isOff(!typescript),
    '@typescript-eslint/no-throw-literal': isOff(!typescript),
    ...propTypes,
  }
}

const buildConfig = ({withReact = false} = {}) => {
  const isReact = withReact || hasReact
  const ifReact = (t, f) => (isReact ? t : f)

  return {
    plugins: ['prettier', 'jest', ifReact('react-hooks')].filter(Boolean),
    extends: [
      ifReact(airbnb(), airbnb('base')),
      'plugin:jest/recommended',
      prettier(),
      prettier('@typescript-eslint'),
      ifReact(prettier('react')),
      ifReact('plugin:react-hooks/recommended'),
    ].filter(Boolean),
    rules: {
      'prettier/prettier': 'error',
      'import/prefer-default-export': 'off',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: rules[
            'import/no-extraneous-dependencies'
          ][1].devDependencies.concat([
            'jest/**',
            'e2e/**',
            '**/prettier.config.js',
          ]),
          optionalDependencies: false,
        },
      ],
      'no-void': ['error', {allowAsStatement: true}],
      ...parserRules(false, isReact),
    },
    overrides: [
      {
        files: ['**/*.ts?(x)'],
        extends: [
          'plugin:@typescript-eslint/recommended-requiring-type-checking',
        ],
        rules: {
          ...parserRules(true, isReact),
        },
      },
      {
        files: testMatch,
        rules: {
          'no-empty': ['error', {allowEmptyCatch: true}],
        },
      },
      {
        files: ['**/*/__tests__/helpers/**/*', '**/*/__tests__/utils/**/*'],
        rules: {
          'jest/no-export': 'off',
        },
      },
    ],
  }
}

module.exports = {buildConfig}
