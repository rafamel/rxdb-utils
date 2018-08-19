const globals = require('eslint-restricted-globals');

module.exports = {
  root: true,
  parser: 'babel-eslint',
  extends: ['standard', 'plugin:import/errors', 'prettier'],
  env: {
    node: true,
    jest: true
  },
  parserOptions: {
    impliedStrict: true
  },
  plugins: ['prettier', 'jest', 'import', 'babel'],
  globals: {},
  rules: {
    'no-console': 1,
    'jsx-a11y/no-autofocus': 0,
    'no-restricted-globals': [2, 'fetch'].concat(globals),
    // eslint-plugin-babel
    'babel/no-invalid-this': 1,
    'babel/semi': 1,
    // Prettier
    'prettier/prettier': [2, require('./.prettierrc')]
  }
};
