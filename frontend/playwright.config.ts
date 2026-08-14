import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        launchOptions: {
          executablePath: process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] || '/usr/bin/chromium',
          args: ['--no-sandbox', '--disable-dev-shm-usage']
        }
      }
    }
  ]
});
