/**
 * WO-O4O-E2E-REGISTRATION-APPROVAL-LOGIN-TEST-V1
 *
 * 전체 서비스 가입→승인→로그인 E2E 테스트
 */
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const SCREENSHOT_DIR = join(process.cwd(), 'e2e', 'screenshots');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const TEST_USER = { email: 'test-e2e-v3@o4o.com', password: 'O4oTestPass1!' };
const TIMEOUT = 15_000;

interface ServiceConfig {
  name: string;
  url: string;
  registerPath: string;
  loginPath: string;
  operatorEmail: string;
  operatorPassword: string;
  approvalPath: string;
  fillRegister: (page: Page) => Promise<void>;
  navigateToApproval: (page: Page) => Promise<void>;
  approveUser: (page: Page, email: string) => Promise<boolean>;
}

// ─── Helpers ─────────────────────────────────────────────────────

async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
  console.log(`  📸 ${name}.png`);
}

async function waitAndClick(page: Page, selector: string, options?: { timeout?: number }): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout: options?.timeout ?? TIMEOUT });
    await page.click(selector);
    return true;
  } catch {
    return false;
  }
}

async function fillField(page: Page, selector: string, value: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.fill(selector, value);
    return true;
  } catch {
    console.log(`    ⚠️ Field not found: ${selector}`);
    return false;
  }
}

async function doLogin(page: Page, baseUrl: string, loginPath: string, email: string, password: string): Promise<boolean> {
  await page.goto(`${baseUrl}${loginPath}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Try common login form patterns
  const emailFilled =
    await fillField(page, 'input[type="email"]', email) ||
    await fillField(page, 'input[name="email"]', email) ||
    await fillField(page, 'input[placeholder*="이메일"]', email) ||
    await fillField(page, 'input[placeholder*="email"]', email);

  const pwFilled =
    await fillField(page, 'input[type="password"]', password) ||
    await fillField(page, 'input[name="password"]', password);

  if (!emailFilled || !pwFilled) {
    console.log('    ❌ Login form fields not found');
    return false;
  }

  // Click login button
  const loginClicked =
    await waitAndClick(page, 'button[type="submit"]', { timeout: 3000 }) ||
    await waitAndClick(page, 'button:has-text("로그인")', { timeout: 3000 }) ||
    await waitAndClick(page, 'button:has-text("Login")', { timeout: 3000 });

  if (!loginClicked) {
    console.log('    ❌ Login button not found');
    return false;
  }

  await page.waitForTimeout(3000);
  return true;
}

// ─── Service Configs ─────────────────────────────────────────────

const services: ServiceConfig[] = [
  // 1. Neture
  {
    name: 'Neture',
    url: 'https://www.neture.co.kr',
    registerPath: '/register',
    loginPath: '/login',
    operatorEmail: 'admin-neture@o4o.com',
    operatorPassword: 'O4oTestPass',
    approvalPath: '/operator/registrations',
    fillRegister: async (page: Page) => {
      // Step 1: Role selection (supplier)
      const supplierBtn = page.locator('button:has-text("공급자"), button:has-text("supplier"), div:has-text("공급자")').first();
      if (await supplierBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await supplierBtn.click();
        await page.waitForTimeout(1000);
      }
      // Step 2: Fill form
      await fillField(page, 'input[name="email"], input[type="email"]', TEST_USER.email);
      await fillField(page, 'input[name="password"], input[type="password"]', TEST_USER.password);
      // Find confirm password (second password field)
      const pwFields = page.locator('input[type="password"]');
      if (await pwFields.count() >= 2) {
        await pwFields.nth(1).fill(TEST_USER.password);
      }
      await fillField(page, 'input[name="name"], input[placeholder*="이름"], input[placeholder*="담당자"]', '테스트사용자');
      await fillField(page, 'input[name="phone"], input[type="tel"], input[placeholder*="전화"], input[placeholder*="연락처"]', '01012345678');
      await fillField(page, 'input[name="companyName"], input[placeholder*="회사"], input[placeholder*="상호"]', '테스트회사');
      // Check terms
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        if (!(await checkboxes.nth(i).isChecked())) {
          await checkboxes.nth(i).check().catch(() => {});
        }
      }
    },
    navigateToApproval: async (page: Page) => {
      await page.goto('https://www.neture.co.kr/operator/registrations', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
    },
    approveUser: async (page: Page, email: string) => {
      // Search for user
      const searchInput = page.locator('input[placeholder*="검색"], input[type="search"]').first();
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill(email);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
      }
      // Click approve button
      const approveBtn = page.locator('button:has-text("승인")').first();
      if (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await approveBtn.click();
        await page.waitForTimeout(2000);
        return true;
      }
      return false;
    },
  },

  // 2. GlycoPharm
  {
    name: 'GlycoPharm',
    url: 'https://glycopharm.co.kr',
    registerPath: '/register',
    loginPath: '/login',
    operatorEmail: 'admin-glycopharm@o4o.com',
    operatorPassword: 'O4oTestPass',
    approvalPath: '/operator/users',
    fillRegister: async (page: Page) => {
      await fillField(page, 'input[type="email"], input[name="email"]', TEST_USER.email);
      const pwFields = page.locator('input[type="password"]');
      if (await pwFields.count() >= 1) await pwFields.nth(0).fill(TEST_USER.password);
      if (await pwFields.count() >= 2) await pwFields.nth(1).fill(TEST_USER.password);
      await fillField(page, 'input[name="lastName"], input[placeholder*="성"]', '테스트');
      await fillField(page, 'input[name="firstName"], input[placeholder*="이름"]', '사용자');
      await fillField(page, 'input[name="phone"], input[type="tel"]', '01012345678');
      await fillField(page, 'input[name="licenseNumber"], input[placeholder*="면허"]', '12345');
      // Check all checkboxes
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        if (!(await checkboxes.nth(i).isChecked())) {
          await checkboxes.nth(i).check().catch(() => {});
        }
      }
    },
    navigateToApproval: async (page: Page) => {
      await page.goto('https://glycopharm.co.kr/operator/users', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      // Click "가입 신청" tab
      const pendingTab = page.locator('button:has-text("가입 신청")');
      if (await pendingTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await pendingTab.click();
        await page.waitForTimeout(2000);
      }
    },
    approveUser: async (page: Page, email: string) => {
      const searchInput = page.locator('input[placeholder*="검색"]').first();
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill(email);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
      }
      const approveBtn = page.locator('button:has-text("승인")').first();
      if (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await approveBtn.click();
        await page.waitForTimeout(1000);
        // Confirm dialog
        const confirmBtn = page.locator('button:has-text("확인"), button:has-text("예")').first();
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        await page.waitForTimeout(2000);
        return true;
      }
      return false;
    },
  },

  // 3. KPA-a (약사회 본회)
  {
    name: 'KPA-a',
    url: 'https://kpa-society.co.kr',
    registerPath: '/register',
    loginPath: '/login',
    operatorEmail: 'kpa-a-admin@o4o.com',
    operatorPassword: 'O4oTestPass',
    approvalPath: '/operator',
    fillRegister: async (page: Page) => {
      await fillField(page, 'input[type="email"], input[name="email"]', TEST_USER.email);
      const pwFields = page.locator('input[type="password"]');
      if (await pwFields.count() >= 1) await pwFields.nth(0).fill(TEST_USER.password);
      if (await pwFields.count() >= 2) await pwFields.nth(1).fill(TEST_USER.password);
      await fillField(page, 'input[name="lastName"], input[placeholder*="성"]', '테스트');
      await fillField(page, 'input[name="firstName"], input[placeholder*="이름"]', '사용자');
      await fillField(page, 'input[name="nickname"], input[placeholder*="닉네임"], input[placeholder*="표시"]', '테스트약사');
      await fillField(page, 'input[name="phone"], input[type="tel"]', '01012345678');
      await fillField(page, 'input[name="licenseNumber"], input[placeholder*="면허"]', '99999');
      // Branch/Group selection (dropdowns)
      const selects = page.locator('select');
      const selectCount = await selects.count();
      if (selectCount >= 1) {
        // Select first available branch
        const branchSelect = selects.nth(0);
        await branchSelect.waitFor({ timeout: 5000 }).catch(() => {});
        const options = await branchSelect.locator('option').all();
        if (options.length > 1) {
          await branchSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1500);
        }
      }
      if (selectCount >= 2) {
        // Select first available group
        const groupSelect = selects.nth(1);
        await page.waitForTimeout(1000);
        const options2 = await groupSelect.locator('option').all();
        if (options2.length > 1) {
          await groupSelect.selectOption({ index: 1 });
        }
      }
      // Check terms
      const checkboxes = page.locator('input[type="checkbox"]');
      const cbCount = await checkboxes.count();
      for (let i = 0; i < cbCount; i++) {
        if (!(await checkboxes.nth(i).isChecked())) {
          await checkboxes.nth(i).check().catch(() => {});
        }
      }
    },
    navigateToApproval: async (page: Page) => {
      await page.goto('https://kpa-society.co.kr/operator/members', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      // Click "가입 신청" or "대기" tab if exists
      const pendingTab = page.locator('button:has-text("가입 신청"), button:has-text("대기"), button:has-text("pending")').first();
      if (await pendingTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await pendingTab.click();
        await page.waitForTimeout(2000);
      }
    },
    approveUser: async (page: Page, email: string) => {
      const searchInput = page.locator('input[placeholder*="검색"]').first();
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill(email);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
      }
      const approveBtn = page.locator('button:has-text("승인")').first();
      if (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await approveBtn.click();
        await page.waitForTimeout(2000);
        return true;
      }
      return false;
    },
  },

  // 4. K-Cosmetics
  {
    name: 'K-Cosmetics',
    url: 'https://k-cosmetics.site',
    registerPath: '/register',
    loginPath: '/login',
    operatorEmail: 'admin-k-cosmetics@o4o.com',
    operatorPassword: 'O4oTestPass',
    approvalPath: '/operator/users',
    fillRegister: async (page: Page) => {
      // Step 1: Role selection (consumer)
      const consumerBtn = page.locator('button:has-text("소비자"), button:has-text("consumer"), div:has-text("일반")').first();
      if (await consumerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await consumerBtn.click();
        await page.waitForTimeout(1000);
      }
      await fillField(page, 'input[type="email"], input[name="email"]', TEST_USER.email);
      const pwFields = page.locator('input[type="password"]');
      if (await pwFields.count() >= 1) await pwFields.nth(0).fill(TEST_USER.password);
      if (await pwFields.count() >= 2) await pwFields.nth(1).fill(TEST_USER.password);
      await fillField(page, 'input[name="name"], input[placeholder*="이름"]', '테스트사용자');
      await fillField(page, 'input[name="phone"], input[type="tel"]', '01012345678');
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        if (!(await checkboxes.nth(i).isChecked())) {
          await checkboxes.nth(i).check().catch(() => {});
        }
      }
    },
    navigateToApproval: async (page: Page) => {
      await page.goto('https://k-cosmetics.site/operator/users', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      const pendingTab = page.locator('button:has-text("가입 신청")');
      if (await pendingTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await pendingTab.click();
        await page.waitForTimeout(2000);
      }
    },
    approveUser: async (page: Page, email: string) => {
      const searchInput = page.locator('input[placeholder*="검색"]').first();
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill(email);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
      }
      const approveBtn = page.locator('button:has-text("승인")').first();
      if (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await approveBtn.click();
        await page.waitForTimeout(1000);
        const confirmBtn = page.locator('button:has-text("확인"), button:has-text("예")').first();
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        await page.waitForTimeout(2000);
        return true;
      }
      return false;
    },
  },
];

// ─── Results ─────────────────────────────────────────────────────

interface TestResult {
  service: string;
  registerSuccess: boolean;
  registerNote: string;
  approvalSuccess: boolean;
  approvalNote: string;
  loginSuccess: boolean;
  loginNote: string;
  accessSuccess: boolean;
  accessNote: string;
}

// ─── Main ────────────────────────────────────────────────────────

async function runTests(): Promise<void> {
  const browser: Browser = await chromium.launch({ headless: true });
  const results: TestResult[] = [];

  for (const svc of services) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Testing: ${svc.name} (${svc.url})`);
    console.log('='.repeat(60));

    const result: TestResult = {
      service: svc.name,
      registerSuccess: false,
      registerNote: '',
      approvalSuccess: false,
      approvalNote: '',
      loginSuccess: false,
      loginNote: '',
      accessSuccess: false,
      accessNote: '',
    };

    // ── Phase 1: Registration ──────────────────────────────────
    console.log('\n📝 Phase 1: Registration');
    let ctx: BrowserContext | null = null;
    let page: Page | null = null;
    try {
      ctx = await browser.newContext({ ignoreHTTPSErrors: true });
      page = await ctx.newPage();

      await page.goto(`${svc.url}${svc.registerPath}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      await screenshot(page, `${svc.name}-01-register-page`);

      // Fill form
      await svc.fillRegister(page);
      await page.waitForTimeout(1000);
      await screenshot(page, `${svc.name}-02-register-filled`);

      // Submit — try multiple button texts
      const submitClicked =
        await waitAndClick(page, 'button:has-text("가입하기")', { timeout: 3000 }) ||
        await waitAndClick(page, 'button:has-text("가입 신청")', { timeout: 3000 }) ||
        await waitAndClick(page, 'button:has-text("회원가입")', { timeout: 3000 }) ||
        await waitAndClick(page, 'button[type="submit"]', { timeout: 3000 }) ||
        await waitAndClick(page, 'button:has-text("Register")', { timeout: 3000 });

      if (submitClicked) {
        await page.waitForTimeout(5000);
        await screenshot(page, `${svc.name}-03-register-result`);

        const url = page.url();
        const bodyText = await page.textContent('body') || '';

        if (url.includes('pending') || bodyText.includes('대기') || bodyText.includes('승인') ||
            bodyText.includes('완료') || bodyText.includes('성공') || bodyText.includes('신청')) {
          result.registerSuccess = true;
          result.registerNote = 'Registration submitted successfully';
        } else if (bodyText.includes('이미') || bodyText.includes('already') || bodyText.includes('409') ||
                   bodyText.includes('ALREADY') || bodyText.includes('중복')) {
          result.registerSuccess = true;
          result.registerNote = 'User already registered (409) — OK for re-test';
        } else if (bodyText.includes('error') || bodyText.includes('오류') || bodyText.includes('실패')) {
          result.registerNote = `Registration error detected. URL: ${url}`;
        } else {
          result.registerNote = `Unclear result. URL: ${url}`;
        }
      } else {
        result.registerNote = 'Submit button not found';
      }
      console.log(`  ${result.registerSuccess ? '✅' : '❌'} ${result.registerNote}`);
    } catch (err: any) {
      result.registerNote = `Error: ${err.message}`;
      console.log(`  ❌ ${result.registerNote}`);
      if (page) await screenshot(page, `${svc.name}-03-register-error`).catch(() => {});
    } finally {
      await ctx?.close();
    }

    // ── Phase 2: Operator Approval ─────────────────────────────
    console.log('\n🔑 Phase 2: Operator Approval');
    try {
      ctx = await browser.newContext({ ignoreHTTPSErrors: true });
      page = await ctx.newPage();

      // Login as operator
      const loginOk = await doLogin(page, svc.url, svc.loginPath, svc.operatorEmail, svc.operatorPassword);
      await screenshot(page, `${svc.name}-04-operator-login`);

      if (!loginOk) {
        result.approvalNote = 'Operator login failed — could not find login form';
        console.log(`  ❌ ${result.approvalNote}`);
      } else {
        const bodyAfterLogin = await page.textContent('body') || '';
        const loginUrl = page.url();
        console.log(`  Operator login URL: ${loginUrl}`);

        // Navigate to approval page
        await svc.navigateToApproval(page);
        await screenshot(page, `${svc.name}-05-approval-page`);

        // Approve user
        const approved = await svc.approveUser(page, TEST_USER.email);
        await screenshot(page, `${svc.name}-06-approval-result`);

        if (approved) {
          result.approvalSuccess = true;
          result.approvalNote = 'User approved successfully';
        } else {
          result.approvalNote = 'Approve button not found or user not in pending list';
        }
        console.log(`  ${result.approvalSuccess ? '✅' : '⚠️'} ${result.approvalNote}`);
      }
    } catch (err: any) {
      result.approvalNote = `Error: ${err.message}`;
      console.log(`  ❌ ${result.approvalNote}`);
      if (page) await screenshot(page, `${svc.name}-06-approval-error`).catch(() => {});
    } finally {
      await ctx?.close();
    }

    // ── Phase 3: Test User Login ───────────────────────────────
    console.log('\n🔓 Phase 3: Test User Login');
    try {
      ctx = await browser.newContext({ ignoreHTTPSErrors: true });
      page = await ctx.newPage();

      const loginOk = await doLogin(page, svc.url, svc.loginPath, TEST_USER.email, TEST_USER.password);
      await page.waitForTimeout(3000);
      await screenshot(page, `${svc.name}-07-user-login`);

      const loginUrl = page.url();
      const bodyText = await page.textContent('body') || '';

      if (loginUrl.includes('login') || bodyText.includes('비밀번호') && bodyText.includes('이메일')) {
        result.loginNote = `Login may have failed — still on login page: ${loginUrl}`;
      } else if (bodyText.includes('대기') || bodyText.includes('pending') || loginUrl.includes('pending')) {
        result.loginSuccess = true;
        result.loginNote = 'Login OK but user is pending approval';
      } else {
        result.loginSuccess = true;
        result.loginNote = `Login successful — redirected to: ${loginUrl}`;
      }
      console.log(`  ${result.loginSuccess ? '✅' : '❌'} ${result.loginNote}`);

      // ── Phase 4: Service Access ────────────────────────────
      console.log('\n🌐 Phase 4: Service Access');
      if (result.loginSuccess) {
        await page.goto(svc.url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        await screenshot(page, `${svc.name}-08-dashboard`);

        const dashUrl = page.url();
        const dashBody = await page.textContent('body') || '';

        if (dashUrl.includes('login') || dashUrl.includes('register')) {
          result.accessNote = 'Redirected back to login — access denied';
        } else if (dashBody.includes('대기') || dashUrl.includes('pending')) {
          result.accessNote = 'Access blocked — pending approval status';
        } else {
          result.accessSuccess = true;
          result.accessNote = `Dashboard accessible at: ${dashUrl}`;
        }
      } else {
        result.accessNote = 'Skipped — login failed';
      }
      console.log(`  ${result.accessSuccess ? '✅' : '⚠️'} ${result.accessNote}`);
    } catch (err: any) {
      result.loginNote = `Error: ${err.message}`;
      console.log(`  ❌ ${result.loginNote}`);
      if (page) await screenshot(page, `${svc.name}-08-login-error`).catch(() => {});
    } finally {
      await ctx?.close();
    }

    results.push(result);
  }

  await browser.close();

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('📊 E2E TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  for (const r of results) {
    console.log(`\n🏢 ${r.service}`);
    console.log(`  가입: ${r.registerSuccess ? '✅ OK' : '❌ FAIL'} — ${r.registerNote}`);
    console.log(`  승인: ${r.approvalSuccess ? '✅ OK' : '❌ FAIL'} — ${r.approvalNote}`);
    console.log(`  로그인: ${r.loginSuccess ? '✅ OK' : '❌ FAIL'} — ${r.loginNote}`);
    console.log(`  접근: ${r.accessSuccess ? '✅ OK' : '❌ FAIL'} — ${r.accessNote}`);
  }

  // Write JSON results
  const { writeFileSync } = await import('fs');
  writeFileSync(
    join(SCREENSHOT_DIR, 'results.json'),
    JSON.stringify(results, null, 2),
  );
  console.log(`\n📁 Screenshots: ${SCREENSHOT_DIR}`);
  console.log(`📄 Results: ${join(SCREENSHOT_DIR, 'results.json')}`);
}

runTests().catch(console.error);
