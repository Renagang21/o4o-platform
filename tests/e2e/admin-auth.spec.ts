import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = 'test@admin.com'
const ADMIN_PASSWORD = 'pw123'
const USER_EMAIL = 'test@user.com' 
const USER_PASSWORD = 'pw123'

const MAIN_SITE_URL = process.env.MAIN_SITE_URL || 'http://localhost:3000'
const ADMIN_SITE_URL = process.env.ADMIN_SITE_URL || 'http://localhost:3012'

test.describe('관리자 인증 및 권한 제어 E2E 테스트', () => {
  
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로컬 스토리지 정리
    await page.goto(MAIN_SITE_URL)
    await page.evaluate(() => localStorage.clear())
    await page.goto(ADMIN_SITE_URL)
    await page.evaluate(() => localStorage.clear())
  })

  test('시나리오 1: 관리자 계정 정상 로그인 및 대시보드 접근', async ({ page }) => {
    // 1. 관리자 대시보드 직접 접근
    await page.goto(ADMIN_SITE_URL)
    
    // 2. 로그인 페이지가 표시되는지 확인
    await expect(page.locator('h1')).toContainText('관리자 로그인')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    
    // 3. 관리자 계정으로 로그인
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    
    // 4. 로그인 성공 후 대시보드로 리디렉션되는지 확인
    await expect(page).toHaveURL(/.*\/dashboard/)
    
    // 5. 관리자 레이아웃 요소들이 표시되는지 확인
    await expect(page.locator('aside')).toBeVisible() // 사이드바
    await expect(page.locator('header')).toBeVisible() // 헤더
    await expect(page.locator('nav')).toBeVisible() // 네비게이션
    
    // 6. 관리자 메뉴 항목들이 표시되는지 확인
    await expect(page.locator('text=대시보드')).toBeVisible()
    await expect(page.locator('text=사용자 관리')).toBeVisible()
    await expect(page.locator('text=콘텐츠 관리')).toBeVisible()
    await expect(page.locator('text=이커머스')).toBeVisible()
    
    // 7. 브레드크럼이 표시되는지 확인
    await expect(page.locator('nav').first()).toBeVisible()
    
    // 8. 사용자 정보가 헤더에 표시되는지 확인
    await expect(page.locator('text=Admin').or(page.locator(`text=${ADMIN_EMAIL}`))).toBeVisible()
  })

  test('시나리오 2: 일반 사용자 계정 접근 거부', async ({ page }) => {
    // 1. 먼저 메인 사이트에서 일반 사용자로 로그인
    await page.goto(MAIN_SITE_URL)
    
    // 로그인 버튼 클릭 (상단 네비게이션에서)
    await page.click('text=Login')
    
    // 일반 사용자 계정으로 로그인
    await page.fill('input[type="email"]', USER_EMAIL)
    await page.fill('input[type="password"]', USER_PASSWORD)
    await page.click('button[type="submit"]')
    
    // 로그인 성공 확인
    await expect(page).toHaveURL(MAIN_SITE_URL)
    
    // 2. 이제 관리자 대시보드에 접근 시도
    await page.goto(ADMIN_SITE_URL)
    
    // 3. 접근 거부 페이지가 표시되는지 확인
    await expect(page.locator('h1')).toContainText('접근 권한이 없습니다')
    await expect(page.locator('text=관리자 권한이 필요한 페이지입니다')).toBeVisible()
    await expect(page.locator('text=일반 사용자는 접근할 수 없습니다')).toBeVisible()
    
    // 4. 자동 리디렉션 메시지 확인
    await expect(page.locator('text=3초 후 자동으로 메인 페이지로 이동합니다')).toBeVisible()
    
    // 5. "지금 메인 페이지로 이동" 버튼 클릭
    await page.click('text=지금 메인 페이지로 이동')
    
    // 6. 메인 사이트로 리디렉션되는지 확인
    await expect(page).toHaveURL(MAIN_SITE_URL)
  })

  test('시나리오 3: 미인증 사용자 접근 시 로그인 페이지로 리디렉션', async ({ page }) => {
    // 1. 로그인하지 않은 상태에서 관리자 대시보드 접근
    await page.goto(`${ADMIN_SITE_URL}/dashboard`)
    
    // 2. 로그인 페이지로 리디렉션되는지 확인
    await expect(page.locator('h1')).toContainText('관리자 로그인')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    
    // 3. 다른 관리자 페이지들도 테스트
    const protectedRoutes = [
      '/users',
      '/content',
      '/products', 
      '/orders',
      '/analytics',
      '/settings'
    ]
    
    for (const route of protectedRoutes) {
      await page.goto(`${ADMIN_SITE_URL}${route}`)
      await expect(page.locator('h1')).toContainText('관리자 로그인')
    }
  })

  test('시나리오 4: 메인 사이트에서 관리자 진입점 테스트', async ({ page }) => {
    // 1. 메인 사이트 접속
    await page.goto(MAIN_SITE_URL)
    
    // 2. 관리자 링크가 표시되는지 확인 (테스트 배너)
    await expect(page.locator('text=관리자')).toBeVisible()
    
    // 3. 관리자 링크 클릭
    await page.click('text=관리자')
    
    // 4. 관리자 대시보드로 이동하는지 확인
    await expect(page).toHaveURL(new RegExp(`${ADMIN_SITE_URL.replace('http://', '').replace('https://', '')}`))
    
    // 5. 로그인 페이지가 표시되는지 확인 (미인증 상태이므로)
    await expect(page.locator('h1')).toContainText('관리자 로그인')
  })

  test('시나리오 5: 로그아웃 기능 테스트', async ({ page }) => {
    // 1. 관리자로 로그인
    await page.goto(ADMIN_SITE_URL)
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    
    // 2. 대시보드 접근 확인
    await expect(page).toHaveURL(/.*\/dashboard/)
    
    // 3. 사용자 메뉴 클릭
    await page.click('[data-testid="user-menu"]', { timeout: 5000 }).catch(async () => {
      // data-testid가 없는 경우 대체 방법
      await page.click('button:has-text("Admin")')
    })
    
    // 4. 로그아웃 버튼 클릭
    await page.click('text=로그아웃')
    
    // 5. 로그인 페이지로 리디렉션되는지 확인
    await expect(page.locator('h1')).toContainText('관리자 로그인')
    
    // 6. 로그아웃 후 보호된 페이지 접근 시도
    await page.goto(`${ADMIN_SITE_URL}/dashboard`)
    await expect(page.locator('h1')).toContainText('관리자 로그인')
  })

  test('시나리오 6: 세션 지속성 테스트', async ({ page }) => {
    // 1. 관리자로 로그인
    await page.goto(ADMIN_SITE_URL)
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    
    // 2. 대시보드 접근 확인
    await expect(page).toHaveURL(/.*\/dashboard/)
    
    // 3. 페이지 새로고침
    await page.reload()
    
    // 4. 여전히 로그인 상태인지 확인
    await expect(page).toHaveURL(/.*\/dashboard/)
    await expect(page.locator('aside')).toBeVisible()
    
    // 5. 다른 탭에서 접근 테스트 (새 컨텍스트)
    const newPage = await page.context().newPage()
    await newPage.goto(`${ADMIN_SITE_URL}/users`)
    
    // 6. 동일한 세션이 유지되는지 확인
    await expect(newPage.locator('aside')).toBeVisible()
    
    await newPage.close()
  })

  test('시나리오 7: 권한별 메뉴 표시 테스트', async ({ page }) => {
    // 1. 관리자로 로그인
    await page.goto(ADMIN_SITE_URL)
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    
    // 2. 모든 관리자 메뉴가 표시되는지 확인
    const adminMenuItems = [
      '대시보드',
      '사용자 관리', 
      '콘텐츠 관리',
      '이커머스',
      '분석 & 리포트',
      '설정'
    ]
    
    for (const menuItem of adminMenuItems) {
      await expect(page.locator(`text=${menuItem}`)).toBeVisible()
    }
    
    // 3. 서브메뉴 확장 테스트
    await page.click('text=사용자 관리')
    await expect(page.locator('text=전체 사용자')).toBeVisible()
    await expect(page.locator('text=승인 대기')).toBeVisible()
    
    await page.click('text=콘텐츠 관리')
    await expect(page.locator('text=게시글')).toBeVisible()
    await expect(page.locator('text=페이지')).toBeVisible()
  })
})

test.describe('관리자 대시보드 네비게이션 테스트', () => {
  
  test.beforeEach(async ({ page }) => {
    // 관리자로 로그인
    await page.goto(ADMIN_SITE_URL)
    await page.evaluate(() => localStorage.clear())
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*\/dashboard/)
  })

  test('브레드크럼 네비게이션 테스트', async ({ page }) => {
    // 1. 사용자 관리 페이지로 이동
    await page.click('text=사용자 관리')
    await page.click('text=전체 사용자')
    
    // 2. 브레드크럼이 올바르게 표시되는지 확인
    await expect(page.locator('nav').first()).toContainText('대시보드')
    await expect(page.locator('nav').first()).toContainText('사용자 관리')
    
    // 3. 브레드크럼을 통한 네비게이션 테스트
    await page.click('text=대시보드')
    await expect(page).toHaveURL(/.*\/dashboard/)
  })

  test('사이드바 모바일 반응형 테스트', async ({ page }) => {
    // 1. 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 })
    
    // 2. 사이드바가 숨겨져 있는지 확인
    await expect(page.locator('aside')).not.toBeVisible()
    
    // 3. 햄버거 메뉴 버튼 클릭
    await page.click('[data-testid="mobile-menu-button"]').catch(async () => {
      // data-testid가 없는 경우 대체
      await page.click('button:has([class*="Menu"])')
    })
    
    // 4. 사이드바가 표시되는지 확인
    await expect(page.locator('aside')).toBeVisible()
    
    // 5. 백드롭 클릭으로 사이드바 닫기
    await page.click('.bg-black.bg-opacity-50')
    await expect(page.locator('aside')).not.toBeVisible()
  })
})