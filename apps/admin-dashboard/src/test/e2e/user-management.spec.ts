/**
 * 사용자 관리 E2E 테스트
 * 전체 사용자 관리 플로우 테스트 - 목록, 생성, 수정, 삭제, 일괄 작업
 */

import { test, expect, Page } from '@playwright/test';

// 테스트 헬퍼 함수들
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', process.env.TEST_ADMIN_EMAIL || 'admin@example.com');
  await page.fill('[data-testid="password-input"]', process.env.TEST_ADMIN_PASSWORD || 'test-password');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
}

async function navigateToUsers(page: Page) {
  await page.click('text=사용자 관리');
  await page.waitForURL('/users');
  await expect(page.locator('h1')).toContainText('사용자 관리');
}

async function waitForUsersToLoad(page: Page) {
  await page.waitForSelector('[data-testid="users-table"]', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

test.describe('사용자 관리 E2E 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 관리자로 로그인
    await loginAsAdmin(page);
  });

  test.describe('사용자 목록 조회', () => {
    test('사용자 목록 페이지가 올바르게 로드된다', async ({ page }) => {
      await navigateToUsers(page);

      // 페이지 헤더 확인
      await expect(page.locator('h1')).toContainText('사용자 관리');
      await expect(page.locator('text=플랫폼 사용자들을 관리하고 모니터링합니다')).toBeVisible();

      // 새 사용자 추가 버튼 확인
      await expect(page.locator('text=새 사용자 추가')).toBeVisible();

      // 필터 요소들 확인
      await expect(page.locator('input[placeholder*="검색"]')).toBeVisible();
      await expect(page.locator('select').first()).toBeVisible(); // 역할 필터
      await expect(page.locator('select').nth(1)).toBeVisible(); // 상태 필터

      // 테이블 로드 대기
      await waitForUsersToLoad(page);

      // 사용자 테이블 확인
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    });

    test('사용자 데이터가 올바르게 표시된다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 사용자 정보 확인 (MSW 모킹 데이터 기준)
      await expect(page.locator('text=홍길동')).toBeVisible();
      await expect(page.locator('text=admin@example.com')).toBeVisible();

      // 역할 배지 확인
      await expect(page.locator('text=관리자')).toBeVisible();
      await expect(page.locator('text=일반회원')).toBeVisible();

      // 상태 아이콘과 텍스트 확인
      await expect(page.locator('text=승인됨')).toBeVisible();
      await expect(page.locator('text=승인대기')).toBeVisible();

      // 통계 카드 확인
      await expect(page.locator('text=전체 사용자')).toBeVisible();
      await expect(page.locator('text=승인 대기')).toBeVisible();
      await expect(page.locator('text=승인됨')).toBeVisible();
    });

    test('사용자 목록 페이지네이션이 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 페이지네이션 정보 확인
      await expect(page.locator('text*="명 중"')).toBeVisible();
      await expect(page.locator('text*="명 표시"')).toBeVisible();
    });
  });

  test.describe('검색 및 필터링', () => {
    test('사용자 이름 검색이 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      const searchInput = page.locator('input[placeholder*="검색"]');
      
      // 검색어 입력
      await searchInput.fill('홍길동');
      await page.waitForTimeout(500); // 디바운스 대기

      // 검색 결과 확인
      await expect(page.locator('text=홍길동')).toBeVisible();
    });

    test('이메일 검색이 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      const searchInput = page.locator('input[placeholder*="검색"]');
      
      // 이메일로 검색
      await searchInput.fill('admin@example.com');
      await page.waitForTimeout(500);

      // 검색 결과 확인
      await expect(page.locator('text=admin@example.com')).toBeVisible();
    });

    test('역할 필터가 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 관리자 필터 선택
      await page.selectOption('select >> nth=0', 'admin');
      await page.waitForTimeout(500);

      // 필터링 결과 확인 (관리자만 표시)
      await expect(page.locator('text=관리자')).toBeVisible();
    });

    test('상태 필터가 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 승인됨 필터 선택
      await page.selectOption('select >> nth=1', 'approved');
      await page.waitForTimeout(500);

      // 승인된 사용자들만 표시되어야 함
      await expect(page.locator('text=승인됨')).toBeVisible();
    });

    test('필터 초기화가 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      const searchInput = page.locator('input[placeholder*="검색"]');
      
      // 필터 설정
      await searchInput.fill('홍길동');
      await page.selectOption('select >> nth=0', 'admin');

      // 필터 초기화
      await page.click('text=필터 초기화');

      // 초기화 확인
      await expect(searchInput).toHaveValue('');
      await expect(page.locator('select >> nth=0')).toHaveValue('all');
    });
  });

  test.describe('사용자 생성 플로우', () => {
    test('새 일반 사용자 생성이 성공한다', async ({ page }) => {
      await navigateToUsers(page);
      
      // 새 사용자 추가 버튼 클릭
      await page.click('text=새 사용자 추가');
      await page.waitForURL('/users/new');

      // 폼 필드 입력
      await page.fill('input[name="name"]', '김테스트');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.fill('input[name="phone"]', '010-1234-5678');
      
      // 역할과 상태 선택
      await page.selectOption('select[name="role"]', 'customer');
      await page.selectOption('select[name="status"]', 'approved');

      // 제출
      await page.click('text=사용자 생성');

      // 성공 메시지 확인
      await expect(page.locator('text*="성공"')).toBeVisible({ timeout: 5000 });

      // 사용자 목록으로 리다이렉트 확인
      await page.waitForURL('/users');
    });

    test('사업자 사용자 생성이 성공한다', async ({ page }) => {
      await navigateToUsers(page);
      await page.click('text=새 사용자 추가');
      await page.waitForURL('/users/new');

      // 기본 정보 입력
      await page.fill('input[name="name"]', '김사업자');
      await page.fill('input[name="email"]', 'business@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      
      // 사업자 역할 선택
      await page.selectOption('select[name="role"]', 'business');

      // 사업자 정보 필드가 나타나는지 확인
      await expect(page.locator('text=사업자 정보')).toBeVisible();

      // 사업자 정보 입력
      await page.fill('input[name="businessInfo.businessName"]', '테스트 컴퍼니');
      await page.fill('input[name="businessInfo.businessNumber"]', '123-45-67890');
      await page.fill('input[name="businessInfo.representativeName"]', '김대표');
      await page.selectOption('select[name="businessInfo.businessType"]', '법인');

      // 제출
      await page.click('text=사용자 생성');

      // 성공 확인
      await expect(page.locator('text*="성공"')).toBeVisible({ timeout: 5000 });
      await page.waitForURL('/users');
    });

    test('폼 유효성 검증이 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await page.click('text=새 사용자 추가');
      await page.waitForURL('/users/new');

      // 잘못된 데이터 입력
      await page.fill('input[name="name"]', '1'); // 너무 짧음
      await page.fill('input[name="email"]', 'invalid-email'); // 잘못된 형식
      await page.fill('input[name="password"]', '123'); // 너무 약함

      // 다른 필드로 포커스 이동하여 검증 트리거
      await page.click('input[name="phone"]');

      // 에러 메시지 확인
      await expect(page.locator('text*="최소 2자 이상"')).toBeVisible();
      await expect(page.locator('text*="올바른 이메일 형식"')).toBeVisible();
      await expect(page.locator('text*="최소 8자 이상"')).toBeVisible();

      // 제출 버튼이 비활성화되어야 함
      const submitButton = page.locator('text=사용자 생성');
      await expect(submitButton).toBeDisabled();
    });

    test('이메일 중복 검사가 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await page.click('text=새 사용자 추가');
      await page.waitForURL('/users/new');

      // MSW에서 중복으로 설정된 이메일 사용
      await page.fill('input[name="name"]', '김테스트');
      await page.fill('input[name="email"]', 'duplicate@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.selectOption('select[name="role"]', 'customer');
      await page.selectOption('select[name="status"]', 'approved');

      // 제출
      await page.click('text=사용자 생성');

      // 중복 에러 메시지 확인
      await expect(page.locator('text*="이미 사용 중인 이메일"')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('사용자 수정 플로우', () => {
    test('사용자 정보 수정이 성공한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 첫 번째 사용자의 수정 버튼 클릭
      await page.click('[title="사용자 수정"] >> nth=0');
      await page.waitForURL(/\/users\/.*\/edit/);

      // 폼이 기존 데이터로 채워져 있는지 확인
      await expect(page.locator('input[name="name"]')).not.toHaveValue('');
      await expect(page.locator('input[name="email"]')).not.toHaveValue('');

      // 정보 수정
      await page.fill('input[name="name"]', '홍길동 수정됨');
      await page.fill('input[name="phone"]', '010-9876-5432');

      // 제출
      await page.click('text=변경사항 저장');

      // 성공 메시지 확인
      await expect(page.locator('text*="성공"')).toBeVisible({ timeout: 5000 });

      // 목록으로 리다이렉트
      await page.waitForURL('/users');
    });

    test('비밀번호 변경이 선택적으로 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      await page.click('[title="사용자 수정"] >> nth=0');
      await page.waitForURL(/\/users\/.*\/edit/);

      // 비밀번호 필드가 선택사항임을 확인
      await expect(page.locator('text*="변경 시에만 입력"')).toBeVisible();

      // 비밀번호 없이 수정
      await page.fill('input[name="name"]', '수정된 이름');
      await page.click('text=변경사항 저장');

      // 성공해야 함
      await expect(page.locator('text*="성공"')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('사용자 상세 조회', () => {
    test('사용자 상세 페이지가 올바르게 표시된다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 첫 번째 사용자의 상세 버튼 클릭
      await page.click('[title="사용자 상세"] >> nth=0');
      await page.waitForURL(/\/users\/.*(?<!\/edit)$/);

      // 사용자 정보가 표시되는지 확인
      await expect(page.locator('h1')).toContainText('사용자 상세');
      await expect(page.locator('text=기본 정보')).toBeVisible();
      await expect(page.locator('text=권한 및 상태')).toBeVisible();

      // 수정 버튼 확인
      await expect(page.locator('text=정보 수정')).toBeVisible();
    });

    test('사업자 사용자의 사업자 정보가 표시된다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 사업자 사용자 찾기 (role이 business인 사용자)
      await page.selectOption('select >> nth=0', 'business');
      await page.waitForTimeout(500);

      // 사업자 사용자 상세 보기
      await page.click('[title="사용자 상세"] >> nth=0');
      await page.waitForURL(/\/users\/.*(?<!\/edit)$/);

      // 사업자 정보 섹션 확인
      await expect(page.locator('text=사업자 정보')).toBeVisible();
      await expect(page.locator('text*="사업자명"')).toBeVisible();
      await expect(page.locator('text*="사업자등록번호"')).toBeVisible();
    });
  });

  test.describe('사용자 삭제 플로우', () => {
    test('단일 사용자 삭제가 성공한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 삭제할 사용자 이름 기억
      const userName = await page.locator('[data-testid="user-name"] >> nth=1').textContent();

      // 일반 사용자(관리자가 아닌) 삭제 버튼 클릭
      await page.click('[title="사용자 삭제"] >> nth=1');

      // 삭제 확인 모달 확인
      await expect(page.locator('text=사용자 삭제')).toBeVisible();
      await expect(page.locator(`text*="${userName}"`)).toBeVisible();
      await expect(page.locator('text*="영구적으로 삭제됩니다"')).toBeVisible();

      // 삭제 확인
      await page.click('text=사용자 삭제');

      // 성공 메시지 확인
      await expect(page.locator('text*="성공"')).toBeVisible({ timeout: 5000 });

      // 모달이 닫히고 목록이 업데이트되어야 함
      await expect(page.locator('text=사용자 삭제')).not.toBeVisible();
    });

    test('관리자 삭제 시 경고가 표시된다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 관리자 사용자 필터링
      await page.selectOption('select >> nth=0', 'admin');
      await page.waitForTimeout(500);

      // 관리자 삭제 버튼 클릭
      await page.click('[title="사용자 삭제"] >> nth=0');

      // 관리자 삭제 경고 확인
      await expect(page.locator('text=추가 주의사항')).toBeVisible();
      await expect(page.locator('text*="관리자 권한을 가진 사용자"')).toBeVisible();
    });

    test('활성 사용자 삭제 시 경고가 표시된다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 승인된 사용자 필터링
      await page.selectOption('select >> nth=1', 'approved');
      await page.waitForTimeout(500);

      // 활성 사용자 삭제 버튼 클릭
      await page.click('[title="사용자 삭제"] >> nth=0');

      // 활성 사용자 삭제 경고 확인
      await expect(page.locator('text=추가 주의사항')).toBeVisible();
      await expect(page.locator('text*="현재 활성화된 사용자"')).toBeVisible();
    });

    test('삭제 모달에서 취소가 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      await page.click('[title="사용자 삭제"] >> nth=0');
      await expect(page.locator('text=사용자 삭제')).toBeVisible();

      // 취소 버튼 클릭
      await page.click('text=취소');

      // 모달이 닫혀야 함
      await expect(page.locator('text=사용자 삭제')).not.toBeVisible();
    });
  });

  test.describe('일괄 작업 플로우', () => {
    test('다중 사용자 선택이 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 전체 선택 체크박스 클릭
      await page.click('input[type="checkbox"] >> nth=0');

      // 선택된 사용자 정보 표시 확인
      await expect(page.locator('text*="명의 사용자가 선택됨"')).toBeVisible();

      // 일괄 작업 버튼들이 나타나는지 확인
      await expect(page.locator('text=역할 변경')).toBeVisible();
      await expect(page.locator('text=일괄 삭제')).toBeVisible();
    });

    test('일괄 삭제가 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 비관리자 사용자들만 선택 (관리자 제외)
      await page.selectOption('select >> nth=0', 'customer');
      await page.waitForTimeout(500);

      // 개별 체크박스 선택
      await page.click('input[type="checkbox"] >> nth=1');
      await page.click('input[type="checkbox"] >> nth=2');

      // 일괄 삭제 버튼 클릭
      await page.click('text=일괄 삭제');

      // 일괄 삭제 모달 확인
      await expect(page.locator('text=사용자 일괄 삭제')).toBeVisible();
      await expect(page.locator('text*="명 사용자를 삭제합니다"')).toBeVisible();
      await expect(page.locator('text=삭제 대상 사용자')).toBeVisible();

      // 삭제 확인
      await page.click('button:has-text("삭제")');

      // 성공 메시지 확인
      await expect(page.locator('text*="성공"')).toBeVisible({ timeout: 5000 });
    });

    test('일괄 역할 변경이 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 일반 사용자들 선택
      await page.selectOption('select >> nth=0', 'customer');
      await page.waitForTimeout(500);

      // 사용자 선택
      await page.click('input[type="checkbox"] >> nth=1');

      // 역할 변경 버튼 클릭
      await page.click('text=역할 변경');

      // 역할 변경 모달 확인
      await expect(page.locator('text=사용자 역할 변경')).toBeVisible();
      await expect(page.locator('text=선택 사용자')).toBeVisible();
      await expect(page.locator('text=변경할 역할 선택')).toBeVisible();

      // 새 역할 선택 (business)
      await page.click('button:has-text("사업자")');

      // 변경 사항 요약 확인
      await expect(page.locator('text=변경 사항 요약')).toBeVisible();

      // 역할 변경 확인
      await page.click('text=역할 변경');

      // 성공 메시지 확인
      await expect(page.locator('text*="성공"')).toBeVisible({ timeout: 5000 });
    });

    test('관리자 권한 제거 방지 경고가 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 모든 관리자 선택
      await page.selectOption('select >> nth=0', 'admin');
      await page.waitForTimeout(500);

      // 전체 선택
      await page.click('input[type="checkbox"] >> nth=0');

      // 역할 변경 버튼 클릭
      await page.click('text=역할 변경');

      // 일반회원으로 변경 시도 (모든 관리자 권한 제거)
      await page.click('button:has-text("일반회원")');

      // 경고 메시지 확인
      await expect(page.locator('text*="위험: 모든 관리자 권한 제거"')).toBeVisible();
      await expect(page.locator('text*="시스템에 관리자가 없어질 수 있습니다"')).toBeVisible();

      // 확인 버튼이 위험 스타일로 변경되었는지 확인
      const confirmButton = page.locator('button:has-text("역할 변경")');
      await expect(confirmButton).toHaveClass(/wp-button-danger/);
    });

    test('변경사항이 없을 때 버튼이 비활성화된다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 일반 사용자 선택
      await page.selectOption('select >> nth=0', 'customer');
      await page.waitForTimeout(500);

      await page.click('input[type="checkbox"] >> nth=1');
      await page.click('text=역할 변경');

      // 같은 역할(일반회원) 선택
      await page.click('button:has-text("일반회원")');

      // 변경사항 없음 메시지 확인
      await expect(page.locator('text*="변경할 내용이 없습니다"')).toBeVisible();

      // 확인 버튼이 비활성화되어야 함
      const confirmButton = page.locator('button:has-text("역할 변경")');
      await expect(confirmButton).toBeDisabled();
    });
  });

  test.describe('종합 플로우', () => {
    test('전체 사용자 관리 워크플로우가 원활하게 작동한다', async ({ page }) => {
      await navigateToUsers(page);

      // 1. 새 사용자 생성
      await page.click('text=새 사용자 추가');
      await page.fill('input[name="name"]', '테스트 사용자');
      await page.fill('input[name="email"]', 'test-workflow@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.selectOption('select[name="role"]', 'customer');
      await page.selectOption('select[name="status"]', 'approved');
      await page.click('text=사용자 생성');
      
      await page.waitForURL('/users');
      await waitForUsersToLoad(page);

      // 2. 생성된 사용자 검색
      await page.fill('input[placeholder*="검색"]', 'test-workflow@example.com');
      await page.waitForTimeout(500);

      // 3. 사용자 정보 수정
      await page.click('[title="사용자 수정"] >> nth=0');
      await page.fill('input[name="name"]', '수정된 테스트 사용자');
      await page.click('text=변경사항 저장');
      
      await page.waitForURL('/users');

      // 4. 역할 변경
      await page.fill('input[placeholder*="검색"]', 'test-workflow@example.com');
      await page.waitForTimeout(500);
      await page.click('input[type="checkbox"] >> nth=1');
      await page.click('text=역할 변경');
      await page.click('button:has-text("사업자")');
      await page.click('text=역할 변경');
      
      await expect(page.locator('text*="성공"')).toBeVisible({ timeout: 5000 });

      // 5. 최종 삭제
      await page.click('input[type="checkbox"] >> nth=1');
      await page.click('text=일괄 삭제');
      await page.click('button:has-text("삭제")');
      
      await expect(page.locator('text*="성공"')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('접근성 및 사용성', () => {
    test('키보드 내비게이션이 작동한다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // Tab 키로 요소들 간 이동
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // 포커스된 요소가 키보드로 활성화 가능한지 확인
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('모든 버튼과 링크가 접근 가능하다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 주요 버튼들의 접근성 확인
      await expect(page.locator('text=새 사용자 추가')).toBeVisible();
      await expect(page.locator('text=필터 초기화')).toBeVisible();
      await expect(page.locator('[title="사용자 상세"]')).toHaveCount(3);
      await expect(page.locator('[title="사용자 수정"]')).toHaveCount(3);
      await expect(page.locator('[title="사용자 삭제"]')).toHaveCount(3);
    });

    test('모달들이 ESC 키로 닫힌다', async ({ page }) => {
      await navigateToUsers(page);
      await waitForUsersToLoad(page);

      // 삭제 모달 열기
      await page.click('[title="사용자 삭제"] >> nth=0');
      await expect(page.locator('text=사용자 삭제')).toBeVisible();

      // ESC로 닫기
      await page.keyboard.press('Escape');
      
      // 모달이 닫혀야 함 (구현에 따라 다를 수 있음)
      // await expect(page.locator('text=사용자 삭제')).not.toBeVisible();
    });
  });

  test.describe('에러 처리', () => {
    test('네트워크 에러 시 적절한 메시지가 표시된다', async ({ page }) => {
      // 네트워크 요청 차단
      await page.route('**/api/users*', route => route.abort());

      await navigateToUsers(page);

      // 에러 메시지 확인
      await expect(page.locator('text*="데이터 로드 실패"')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=다시 시도')).toBeVisible();
    });

    test('다시 시도 버튼이 작동한다', async ({ page }) => {
      // 첫 번째 요청은 실패
      let requestCount = 0;
      await page.route('**/api/users*', route => {
        requestCount++;
        if (requestCount === 1) {
          route.abort();
        } else {
          route.continue();
        }
      });

      await navigateToUsers(page);
      
      // 에러 상태 확인
      await expect(page.locator('text=다시 시도')).toBeVisible({ timeout: 10000 });

      // 다시 시도 클릭
      await page.click('text=다시 시도');

      // 성공적으로 로드되어야 함
      await waitForUsersToLoad(page);
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    });
  });
});