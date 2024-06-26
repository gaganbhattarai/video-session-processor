module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'google',
    'eslint-config-prettier',
    'plugin:ava/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
  },
  plugins: ['promise', 'ava'],
  rules: {
    'no-restricted-globals': ['error', 'name', 'length'],
    'prefer-arrow-callback': 'warn',
    'quotes': [
      'error',
      'single',
      {allowTemplateLiterals: true, avoidEscape: true},
    ],
    'max-len': [
      'error',
      {
        code: 80,
        tabWidth: 2,
        ignoreComments: true, // "comments": 80
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      },
    ],
    'require-jsdoc': [
      'warn',
      {
        require: {
          FunctionDeclaration: false,
          MethodDefinition: false,
          ClassDeclaration: false,
          ArrowFunctionExpression: false,
          FunctionExpression: false,
        },
      },
    ],
    'no-console': 'off',
    'no-debugger': 'off',
    'no-regex-spaces': 'off',
    'no-template-curly-in-string': 'warn',
    'consistent-return': 'warn',
    'array-callback-return': 'warn',
    'eqeqeq': 'error',
    'no-alert': 'error',
    'no-caller': 'error',
    'no-eq-null': 'error',
    'no-eval': 'error',
    'no-extend-native': 'warn',
    'no-extra-bind': 'warn',
    'no-extra-label': 'warn',
    'no-floating-decimal': 'error',
    'no-implicit-coercion': 'warn',
    'no-loop-func': 'warn',
    'no-new-func': 'error',
    'no-new-wrappers': 'warn',
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    'for-direction': 'error',
    'getter-return': 'error',
    'no-await-in-loop': 'error',
    'no-compare-neg-zero': 'error',
    'no-catch-shadow': 'warn',
    'no-shadow-restricted-names': 'error',
    'callback-return': 'error',
    'handle-callback-err': 'error',
    'no-path-concat': 'warn',
    'promise/always-return': 'error',
    'promise/catch-or-return': 'error',
    'promise/no-nesting': 'warn',
  },
  overrides: [
    {
      files: ['**/*.spec.*', '**/*.test.*'],
      env: {
        jest: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
