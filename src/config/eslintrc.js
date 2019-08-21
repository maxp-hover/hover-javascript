const {ifAnyDep} = require('../utils')
const {testMatch} = require('./jest.config')

const withBaseConfig = base => variant =>
  require.resolve(base + (variant ? `/${variant}` : ''))

const airbnb = withBaseConfig('eslint-config-airbnb-typescript')
const prettier = withBaseConfig('eslint-config-prettier')

module.exports = {
  plugins: ['prettier', 'jest', ifAnyDep('react', 'react-hooks')].filter(
    Boolean,
  ),
  extends: [
    ifAnyDep('react', airbnb(), airbnb('base')),
    'plugin:jest/recommended',
    prettier(),
    prettier('@typescript-eslint'),
    ifAnyDep('react', prettier('react')),
  ].filter(Boolean),
  rules: {
    'prettier/prettier': 'error',
    'import/prefer-default-export': 'off',
  },
  overrides: [
    {
      files: testMatch,
      rules: {
        'no-empty': ['error', {allowEmptyCatch: true}],
      },
    },
  ],
}
