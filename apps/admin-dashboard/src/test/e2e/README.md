# Customizer E2E Tests

End-to-end tests for the O4O Platform Customizer using Playwright.

## Test Coverage

### Core Scenarios (`customizer.spec.ts`)
1. **Color Change Flow** - Customizer → Preview → Frontend
2. **General Section** - Scroll-to-top, Buttons, Breadcrumbs
3. **Legacy Migration** - Automatic migration from v0.0.0 → v1.0.0
4. **Header/Footer Builder** - Layout changes, content updates
5. **Data Persistence** - Settings persistence after reload, `_meta.lastModified` updates

### Error Cases (`customizer-errors.spec.ts`)
- **Authentication (401)** - Redirect to login, unauthorized handling
- **Network Errors (500)** - Server errors, timeouts, offline mode
- **Validation Errors (400)** - Invalid color format, required fields, number ranges
- **Fallback Behavior** - Default settings, missing sections, corrupted storage
- **Edge Cases** - Concurrent saves, race conditions, large data

### Performance Tests
- API response time < 200ms
- Customizer load time < 1s
- Preview update delay < 100ms

## Browser Support
- ✅ Chromium (Desktop Chrome)
- ✅ Firefox (Desktop Firefox)
- ✅ WebKit (Desktop Safari)

## Prerequisites

1. **Environment Setup**
   ```bash
   # Install Playwright browsers (if not already installed)
   npx playwright install
   ```

2. **Test User Credentials**
   Set environment variables for authentication:
   ```bash
   export E2E_TEST_EMAIL="test@example.com"
   export E2E_TEST_PASSWORD="test123456"
   ```

   Or create a `.env.test` file in the admin-dashboard root:
   ```env
   E2E_TEST_EMAIL=test@example.com
   E2E_TEST_PASSWORD=test123456
   ```

3. **Dev Server Running**
   The tests automatically start the dev server, but you can also run it manually:
   ```bash
   npm run dev
   ```

## Running Tests

### All Tests
```bash
# From admin-dashboard directory
npm run test:e2e

# Or with Playwright CLI
npx playwright test
```

### Specific Test File
```bash
# Core scenarios only
npx playwright test customizer.spec.ts

# Error cases only
npx playwright test customizer-errors.spec.ts
```

### Specific Browser
```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# WebKit (Safari) only
npx playwright test --project=webkit
```

### Debug Mode
```bash
# Run with UI
npx playwright test --ui

# Run with debugger
npx playwright test --debug

# Run headed (visible browser)
npx playwright test --headed
```

### Watch Mode
```bash
npx playwright test --watch
```

## CI/CD Integration

The tests are configured for CI with:
- Automatic retry on failure (2 retries in CI)
- HTML report generation
- Trace collection on first retry
- Single worker in CI (to avoid race conditions)

### GitHub Actions Example
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
  env:
    E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
    E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
    CI: true

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Test Structure

### Global Setup (`global-setup.ts`)
- Authenticates test user
- Saves auth state to `auth-state.json`
- Runs once before all tests

### Global Teardown (`global-teardown.ts`)
- Cleans up auth state file
- Runs once after all tests

### Test Organization
```
src/test/e2e/
├── README.md                    # This file
├── global-setup.ts              # Authentication setup
├── global-teardown.ts           # Cleanup
├── customizer.spec.ts           # Core scenarios (5 test suites)
└── customizer-errors.spec.ts    # Error cases (5 test suites)
```

## Troubleshooting

### Authentication Fails
- Verify test user credentials exist in database
- Check `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` environment variables
- Manually test login at `http://localhost:3001/login`

### Tests Timeout
- Increase timeout in `playwright.config.ts`:
  ```ts
  use: {
    timeout: 30000, // 30 seconds per test
  }
  ```
- Check if dev server started successfully
- Verify API server is running on correct port

### Preview Frame Not Found
- Some tests expect an iframe preview - if not implemented, tests will log warnings but continue
- Update selectors in tests to match your preview implementation

### Flaky Tests
- Use `test.setTimeout(60000)` for slow operations
- Add more specific waits: `await page.waitForLoadState('networkidle')`
- Use `test.describe.serial()` for tests that must run in order

## Performance Benchmarks

Expected performance (from Day 4 requirements):
- ✅ API response: **< 200ms**
- ✅ Customizer load: **< 1000ms**
- ✅ Preview update: **< 100ms** (debounced)

## Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [O4O Platform Architecture](../../../README.md)
- [Customizer Migration Guide](../../../../../../api-server/MIGRATION_GUIDE.md)
- [Naming Convention](../../../../pages/appearance/astra-customizer/NAMING_CONVENTION.md)
