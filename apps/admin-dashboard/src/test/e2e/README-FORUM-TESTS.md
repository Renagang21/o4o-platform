# Forum E2E Tests Documentation

## Overview

The `forum-management.spec.ts` file contains comprehensive end-to-end tests for the Forum module in the O4O Admin Dashboard. These tests verify all major forum functionality including post management, comments, categories, and administrative features.

## Test Coverage

### 1. 포럼 대시보드 접근 및 기본 UI 확인
- ✅ Forum dashboard navigation
- ✅ Statistics cards display (posts, users, replies, reports)
- ✅ Category overview section
- ✅ Quick actions panel
- ✅ Recent activity feed

### 2. 포럼 게시글 전체 CRUD 워크플로우
- ✅ Create new forum post
- ✅ View post in list
- ✅ View post details
- ✅ Edit existing post
- ✅ Post status management (pin, lock)
- ✅ Form validation

### 3. 댓글 시스템 전체 테스트
- ✅ Write new comments
- ✅ Reply to comments (nested structure)
- ✅ Edit comments
- ✅ Delete comments
- ✅ Comment threading display

### 4. 카테고리 관리 테스트
- ✅ View existing categories
- ✅ Create new categories
- ✅ Category form validation
- ✅ Category display in post forms

### 5. 검색 및 필터링 기능 테스트
- ✅ Search by title/content/author
- ✅ Filter by category
- ✅ Filter by status
- ✅ Clear search filters

### 6. 게시글 상태 관리 테스트
- ✅ Pin/unpin posts
- ✅ Lock/unlock posts
- ✅ Status badges display
- ✅ Bulk operations (if available)

### 7. 게시글 삭제 기능 테스트
- ✅ Delete confirmation dialog
- ✅ Post removal from list
- ✅ Error handling for non-existent posts

### 8. 페이지네이션 및 로딩 상태 테스트
- ✅ Navigate between pages
- ✅ Loading spinner display
- ✅ Content loading verification

### 9. 권한 및 접근 제어 테스트
- ✅ Admin access to all features
- ✅ Management options availability
- ✅ Create/edit/delete permissions

### 10. 에러 처리 및 예외 상황 테스트
- ✅ Form validation errors
- ✅ Non-existent post handling
- ✅ Network error scenarios

### 11. 반응형 디자인 및 모바일 호환성 테스트
- ✅ Mobile viewport (375px)
- ✅ Tablet viewport (768px)
- ✅ Desktop viewport (1920px)
- ✅ Responsive navigation

## Prerequisites

Before running the forum E2E tests, ensure:

1. **API Server is running** on `http://localhost:4000`
2. **Admin Dashboard is running** on `http://localhost:3001`
3. **Test data is available** (MSW mocks are configured)
4. **Admin test account exists**: `admin@neture.co.kr` / `admin123!`

## Running the Tests

### Run All Forum Tests
```bash
# From admin-dashboard directory
npx playwright test src/test/e2e/forum-management.spec.ts

# Or use the helper script
./scripts/run-forum-e2e.sh
```

### Run Specific Test Cases
```bash
# Run only CRUD tests
npx playwright test src/test/e2e/forum-management.spec.ts -g "CRUD"

# Run only comment tests
npx playwright test src/test/e2e/forum-management.spec.ts -g "댓글"

# Run only mobile tests
npx playwright test src/test/e2e/forum-management.spec.ts -g "모바일"
```

### Run with Different Browsers
```bash
# Chrome (default)
npx playwright test src/test/e2e/forum-management.spec.ts --project=chromium

# Firefox
npx playwright test src/test/e2e/forum-management.spec.ts --project=firefox

# Safari
npx playwright test src/test/e2e/forum-management.spec.ts --project=webkit
```

### Debug Mode
```bash
# Run with UI
npx playwright test src/test/e2e/forum-management.spec.ts --ui

# Run in headed mode
npx playwright test src/test/e2e/forum-management.spec.ts --headed

# Debug specific test
npx playwright test src/test/e2e/forum-management.spec.ts -g "CRUD" --debug
```

## Test Data Management

The tests use dynamically generated test data to avoid conflicts:

```javascript
function generateTestData() {
  const timestamp = Date.now();
  return {
    postTitle: `E2E 테스트 게시물 ${timestamp}`,
    postContent: `테스트 내용 ${new Date().toLocaleString('ko-KR')}`,
    commentContent: `테스트 댓글 ${timestamp}`,
    // ... more test data
  };
}
```

This ensures:
- ✅ No test interference
- ✅ Unique identifiers
- ✅ Easy cleanup
- ✅ Parallel test execution

## Mock Data Integration

The tests work with MSW (Mock Service Worker) handlers located in:
- `src/test/mocks/handlers/forum.ts`

Mock data includes:
- Sample forum categories (일반 토론, 제품 리뷰, Q&A)
- Sample posts with various statuses
- Sample comments with nested replies
- Admin user authentication

## Selectors and Locators

The tests use robust selectors that work with the actual UI:

```javascript
// Multiple selector strategies for resilience
const titleInput = page.locator('input[id="title"]');
const categorySelect = page.locator('[data-testid="category-select"]');
const contentTextarea = page.locator('textarea[id="content"]');

// Flexible text-based selectors
await page.click('text=새 게시글');
await page.click('button:has-text("작성하기")');
```

## Error Handling

The tests include comprehensive error handling:

1. **Network Timeouts**: All operations have appropriate timeouts
2. **Element Waiting**: Uses `waitForLoadState('networkidle')`
3. **Conditional Actions**: Checks element visibility before interaction
4. **Graceful Failures**: Tests continue even if optional elements are missing

## Performance Considerations

- Tests use `waitForLoadState('networkidle')` to ensure complete page loads
- Dynamic data generation prevents test pollution
- Efficient selector strategies minimize wait times
- Parallel execution support with unique test data

## Troubleshooting

### Common Issues

1. **"Element not found" errors**
   - Check if the UI has changed
   - Verify selectors match current implementation
   - Ensure page has fully loaded

2. **"Test timeout" errors**
   - Increase timeout values if needed
   - Check network connectivity
   - Verify API server is responding

3. **"Authentication failed" errors**
   - Verify test account credentials
   - Check login flow implementation
   - Ensure session management works

### Debug Commands

```bash
# Check if services are running
curl http://localhost:3001  # Admin dashboard
curl http://localhost:4000/health  # API server

# View test in browser
npx playwright test --headed --slowMo=1000

# Generate test report
npx playwright test --reporter=html
```

## Maintenance

### When to Update Tests

- ✅ UI changes in forum components
- ✅ New forum features added
- ✅ API endpoint changes
- ✅ Authentication flow updates
- ✅ Routing changes

### Best Practices

1. **Keep selectors stable**: Use data-testid attributes when possible
2. **Use dynamic test data**: Prevent test interference
3. **Test real user workflows**: Follow actual user paths
4. **Handle async operations**: Always wait for network requests
5. **Clean up after tests**: Reset state when necessary

## Integration with CI/CD

The tests are designed to work in CI/CD environments:

```yaml
# Example GitHub Actions step
- name: Run Forum E2E Tests
  run: |
    npm run dev:api &
    npm run dev:admin &
    sleep 10  # Wait for services to start
    npx playwright test src/test/e2e/forum-management.spec.ts
```

## Future Enhancements

Potential improvements for the test suite:

- [ ] Visual regression testing
- [ ] Performance benchmarking
- [ ] Accessibility testing
- [ ] Cross-browser screenshot comparison
- [ ] API response validation
- [ ] Database state verification

---

**Note**: These tests are designed to work with the O4O Platform's forum module and may need adjustments if the UI or API implementation changes.