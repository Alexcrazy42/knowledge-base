module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    'semi': 'off',
    'comma-dangle': 'error',
    'object-curly-newline': ['error', { 'consistent': true }],
    'object-curly-spacing': ['error', 'always']
  }
};