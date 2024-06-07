module.exports = {
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/**/__tests__/**/*.js'],
      testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/__tests__/lib',
      ],
      testEnvironment: 'node',
    },
  ],
  reporters: ['default', '.'],
};
