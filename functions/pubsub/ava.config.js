module.exports = {
  files: [
    './**/__tests__/**/*.test.js',
    '!**/__tests__/lib',
    '!**/node_modules/',
  ],
  failFast: true,
  failWithoutAssertions: false,
  environmentVariables: {
    PROJECT_ID: 'test_project_id',
    GCLOUD_PROJECT: 'test_project',
    FUNCTION_TARGET: 'test_function',
    APP_ENV: 'dev',
    STORAGE_BUCKET: 'test-bucket',
  },
  verbose: true,
  timeout: '2m',
  nodeArguments: ['--trace-deprecation', '--napi-modules'],
};
