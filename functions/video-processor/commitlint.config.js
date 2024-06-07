module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-case': [2, 'always', ['lower-case', 'sentence-case', 'upper-case']],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'Build',
        'chore',
        'Chore',
        'ci',
        'Ci',
        'CI',
        'docs',
        'Docs',
        'feat',
        'Feat',
        'fix',
        'Fix',
        'perf',
        'Perf',
        'refactor',
        'Refactor',
        'revert',
        'Revert',
        'style',
        'Style',
        'test',
        'Test',
      ],
    ],
    'header-max-length': [1, 'always', 72],
    'subject-case': [
      2,
      'always',
      [
        'sentence-case',
        'start-case',
        'pascal-case',
        'upper-case',
        'lower-case',
      ],
    ],
    'body-max-line-length': [1, 'always', 72],
    'body-case': [1, 'always', ['lower-case', 'sentence-case']],
  },
};