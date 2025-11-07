# Phase 9: Seller Authorization - Test Scenario Matrix

This document outlines the complete test scenario matrix for Phase 9 Seller Authorization System.

For detailed test specifications, see: `/home/sohae21/o4o-platform/docs/phase9_test_report.md`

---

## Unit Test Scenarios (10)

| # | Test Name | Description | Expected Result | Priority |
|---|-----------|-------------|-----------------|----------|
| 1 | Product Limit Enforcement | Reject 11th authorization when limit is 10 | Status 400, `ERR_PRODUCT_LIMIT_REACHED` | P0 |
| 2 | 30-Day Cooldown After Rejection | Block re-request within 30 days | Status 400, `ERR_COOLDOWN_ACTIVE` | P0 |
| 3 | Permanent Block After Revocation | Block re-request after revocation | Status 400, `ERR_AUTHORIZATION_REVOKED` | P0 |
| 4 | Duplicate Request Prevention | Block duplicate requests | Status 409, `ERR_DUPLICATE_AUTHORIZATION` | P0 |
| 5 | Role-Based Access Control | Only sellers can access seller endpoints | Status 403, `ERR_INSUFFICIENT_PERMISSIONS` | P0 |
| 6 | Status Transition Validation | Validate legal state transitions | Throw `InvalidStateTransitionError` | P1 |
| 7 | Cooldown Calculation Accuracy | 30 days calculation correct | Exact timestamp match | P0 |
| 8 | Metadata Snapshot Integrity | Capture product metadata at approval | Metadata immutable | P1 |
| 9 | Authorization Expiry | Support optional expiry dates | Gate returns false after expiry | P2 |
| 10 | Bulk Authorization Check Performance | Check 100 products in <50ms | P95 latency <50ms | P0 |

---

## Integration Test Scenarios (6)

| # | Test Name | Description | Expected Result | Priority |
|---|-----------|-------------|-----------------|----------|
| 1 | Unapproved Seller Blocked from Order | Cart add fails without authorization | Status 403, cart empty | P0 |
| 2 | Approved Seller Can Create Order | Full flow: request → approve → order | Status 201, order created | P0 |
| 3 | Reject → Cooldown → Re-Request Blocked | Enforce cooldown across all actions | Status 400, cooldown active | P0 |
| 4 | Product Limit Threshold | Concurrent requests respect limit | Only 1 succeeds, 2 fail | P0 |
| 5 | Authorization Error Codes | Consistent error codes | All errors documented | P1 |
| 6 | Audit Log Generation | Log all state changes | 5 audit entries | P1 |

---

## Performance Test Scenarios (3)

| # | Test Name | Target | Measurement | Priority |
|---|-----------|--------|-------------|----------|
| 1 | Authorization Gate Latency | P95 <5ms | Histogram metrics | P0 |
| 2 | Bulk Authorization Check | <50ms for 100 products | Query optimization | P0 |
| 3 | Supplier Inbox Query | <100ms for 500 requests | Pagination + index | P1 |

---

## Test Execution Commands

### Run All Phase 9 Tests
```bash
pnpm test --testPathPattern=phase9
```

### Run Unit Tests Only
```bash
pnpm test --testPathPattern=phase9.*unit
```

### Run Integration Tests Only
```bash
pnpm test --testPathPattern=phase9.*integration
```

### Run Performance Tests
```bash
k6 run tests/performance/phase9-gate-latency.js
```

### Run with Coverage
```bash
pnpm test:cov --testPathPattern=phase9
```

---

## Test Data Requirements

### Seed Data (Test Environment)

**10 Test Sellers**:
- seller-1: BRONZE tier, 0 authorizations
- seller-2: SILVER tier, 5 authorizations
- seller-3: GOLD tier, 9 authorizations (near limit)
- seller-4: PLATINUM tier, 10 authorizations (at limit)
- seller-5: BRONZE tier, 1 rejected (in cooldown)
- seller-6: BRONZE tier, 1 revoked
- seller-7: SILVER tier, 3 approved
- seller-8: GOLD tier, 2 pending
- seller-9: BRONZE tier, no seller role (for RBAC test)
- seller-10: SILVER tier, mixed states

**5 Test Suppliers**:
- supplier-1: 20 products, 10 pending requests
- supplier-2: 50 products, 5 pending requests
- supplier-3: 10 products, 0 pending requests
- supplier-4: 100 products, 50 pending requests (inbox backlog test)
- supplier-5: 5 products, 1 pending request

**50 Test Products**:
- 20 products from supplier-1
- 20 products from supplier-2
- 5 products from supplier-3
- 3 products from supplier-4
- 2 products from supplier-5

**30 Test Authorizations**:
- 10 APPROVED (various sellers)
- 5 REQUESTED (various suppliers)
- 3 REJECTED (with cooldown)
- 2 REVOKED (permanent block)
- 10 varied states

---

## Coverage Requirements

- **Line Coverage**: >80%
- **Branch Coverage**: >75%
- **Critical Paths**: 100% (gate checks, cooldown enforcement, limit checks)

---

## Test Files Location

```
apps/api-server/src/
├── services/
│   └── __tests__/
│       ├── AuthorizationGateService.unit.spec.ts
│       ├── authorization-metrics.service.unit.spec.ts
│       └── seller-authorization.integration.spec.ts
├── routes/
│   └── __tests__/
│       ├── ds-seller-authorization-v2.routes.spec.ts
│       └── admin/seller-authorization.routes.spec.ts
└── migrations/
    └── __tests__/
        └── Phase9-SellerAuthorization.spec.ts
```

---

## Test Helpers & Fixtures

### Test Helper Functions

```typescript
// tests/helpers/phase9-helpers.ts

export const createTestSeller = (tier: SellerTier, authCount: number) => { /* ... */ };
export const createTestSupplier = (productCount: number) => { /* ... */ };
export const createTestAuthorization = (status: AuthorizationStatus) => { /* ... */ };
export const clearPhase9TestData = () => { /* ... */ };
export const seedPhase9TestData = () => { /* ... */ };
```

### Test Fixtures

```typescript
// tests/fixtures/phase9-fixtures.ts

export const SELLER_FIXTURES = {
  bronze_new: { tier: 'BRONZE', authCount: 0 },
  silver_mid: { tier: 'SILVER', authCount: 5 },
  gold_near_limit: { tier: 'GOLD', authCount: 9 },
  platinum_at_limit: { tier: 'PLATINUM', authCount: 10 },
};

export const AUTHORIZATION_FIXTURES = {
  approved: { status: 'APPROVED', approvedAt: new Date() },
  rejected_recent: { status: 'REJECTED', rejectedAt: new Date(), cooldownUntil: addDays(new Date(), 30) },
  revoked: { status: 'REVOKED', revokedAt: new Date(), revocationReason: 'Contract violation' },
};
```

---

## Mocking Strategy

### Mock Redis (Unit Tests)
```typescript
jest.mock('../config/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    mget: jest.fn(),
  }
}));
```

### Mock Database (Unit Tests)
```typescript
jest.mock('../database/connection', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => ({
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
    })),
  }
}));
```

### Use Real Database (Integration Tests)
```typescript
beforeAll(async () => {
  await AppDataSource.initialize();
  await seedPhase9TestData();
});

afterAll(async () => {
  await clearPhase9TestData();
  await AppDataSource.destroy();
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test-phase9.yml
name: Phase 9 Tests

on:
  push:
    branches: [feat/phase9-seller-authorization]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: o4o_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Run Phase 9 Unit Tests
        run: pnpm test --testPathPattern=phase9.*unit

      - name: Run Phase 9 Integration Tests
        run: pnpm test --testPathPattern=phase9.*integration
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/o4o_test
          REDIS_HOST: localhost

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: phase9
```

---

## Test Reporting

### JUnit XML (for CI)
```bash
pnpm test --testPathPattern=phase9 --reporters=jest-junit
```

### HTML Coverage Report
```bash
pnpm test:cov --testPathPattern=phase9
open coverage/lcov-report/index.html
```

### Slack Notification (on failure)
```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Phase 9 tests failed on ${{ github.ref }}"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Success Criteria

- [ ] All 10 unit tests pass
- [ ] All 6 integration tests pass
- [ ] Performance benchmarks met (P95 <5ms)
- [ ] Line coverage >80%
- [ ] Branch coverage >75%
- [ ] No flaky tests (3 consecutive runs pass)

---

**Version**: 1.0.0
**Created**: 2025-01-07
**Status**: Test Matrix Defined (Implementation Pending)
