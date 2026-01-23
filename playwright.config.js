export default {
  testDir: './tests',
  timeout: 60000, // 1 minute timeout per test
  expect: {
    timeout: 10000,
  },
  use: {
    trace: 'on-first-retry',
  },
  webServer: undefined,
};
