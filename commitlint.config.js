module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Custom rule definitions
  rules: {
    'header-max-length': [2, 'always', 100],

    'type-enum': [
      2,
      'always',
      [
        'feat', // New features
        'fix', // Bug fixes
        'docs', // Documentation updates
        'style', // Formatting modifications
        'refactor', // Code restructuring
        'perf', // Performance optimizations
        'test', // Adding/fixing tests
        'chore', // Maintenance or build tools
        'ci', // Continuous Integration work
        'revert', // Rolling back previous commits,
        'wip', // Work in progress
      ],
    ],

    // 3. Prevent the subject line from starting with a capital letter
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],

    // 4. Force a non-empty commit subject description
    'subject-empty': [2, 'never'],

    'type-case': [2, 'always', 'lower-case'],

    'type-empty': [2, 'never'],
  },
};
