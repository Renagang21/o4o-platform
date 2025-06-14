module.exports = {
  // 🎯 기본 설정
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  
  // 📋 파일별 설정
  overrides: [
    {
      files: '*.{js,jsx,ts,tsx}',
      options: {
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 80,
        tabWidth: 2,
      },
    },
    {
      files: '*.{json,jsonc}',
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'preserve',
        tabWidth: 2,
      },
    },
    {
      files: '*.{yml,yaml}',
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },
  ],
  
  // 🚫 무시할 파일들
  ignore: [
    'node_modules',
    'dist',
    'build',
    '.next',
    'coverage',
    'playwright-report',
    'test-results',
    '*.min.js',
    '*.min.css',
  ],
};
