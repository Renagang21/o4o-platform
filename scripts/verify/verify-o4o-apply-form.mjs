/**
 * CHECK-O4O-NETURE-APPLY-FORM-MVP-SMOKE-V1
 *
 * /o4o/apply form MVP production smoke verification.
 *
 * Run:
 *   node scripts/verify/verify-o4o-apply-form.mjs
 *   APPLY_DO_SUBMIT=1 node scripts/verify/verify-o4o-apply-form.mjs   # 실제 POST 1회 수행
 *
 * 환경:
 *   - 자격증명 불필요 (public form).
 *   - APPLY_DO_SUBMIT=1 일 때만 production DB 에 platform_inquiries row 1건 생성됨.
 *
 * 검증 범위 (CHECK §검증 항목):
 *   1. /o4o/apply form 표시
 *   2. ?industry= prefill 5종 (4 known + 1 unknown)
 *   3. 필수 미입력 / consent 미체크 시 validation 차단
 *   4. /privacy 링크 정상 (href 확인)
 *   5. (APPLY_DO_SUBMIT=1) 정상 제출 → POST /api/v1/platform/inquiries → 201
 *   6. payload 검증 (type / source / subject / message metadata)
 *   7. 성공 패널 + 문의 ID 표시
 *   8. 콘솔 오류 0
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE_URL = process.env.NETURE_URL || 'https://neture.co.kr';
const DO_SUBMIT = process.env.APPLY_DO_SUBMIT === '1';
const OUT_DIR = resolve('scripts/verify/output/o4o-apply-form');
mkdirSync(OUT_DIR, { recursive: true });

const log = (...a) => console.log('[smoke]', ...a);
const results = [];
const consoleErrors = [];
const networkErrors = [];

function record(name, status, detail = {}) {
  results.push({ name, status, ...detail });
  const tag = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '·';
  log(`${tag} ${name}`, status === 'FAIL' ? detail : '');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  ignoreHTTPSErrors: true,
});
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    const t = msg.text();
    // React DevTools hint 등 무시
    if (t.includes('Download the React DevTools')) return;
    consoleErrors.push(t);
  }
});
page.on('requestfailed', (req) => {
  // favicon 등 무시
  if (req.url().includes('/favicon')) return;
  networkErrors.push({ url: req.url(), failure: req.failure()?.errorText });
});

// ─── Test 1: form 표시 ────────────────────────────────────────────────────────
{
  await page.goto(`${BASE_URL}/o4o/apply`, { waitUntil: 'domcontentloaded' });
  // SPA: 폼이 렌더될 때까지 대기
  const nameInput = page.locator('#apply-name');
  await nameInput.waitFor({ state: 'visible', timeout: 15000 });
  const allFieldsVisible = await Promise.all([
    page.locator('#apply-name').isVisible(),
    page.locator('#apply-company').isVisible(),
    page.locator('#apply-phone').isVisible(),
    page.locator('#apply-email').isVisible(),
    page.locator('#apply-businessType').isVisible(),
    page.locator('#apply-industry').isVisible(),
    page.locator('#apply-purpose').isVisible(),
    page.locator('#apply-message').isVisible(),
    page.locator('#apply-consent').isVisible(),
  ]);
  const visibleCount = allFieldsVisible.filter(Boolean).length;
  record('1. /o4o/apply 9개 필드 모두 표시', visibleCount === 9 ? 'PASS' : 'FAIL', { visibleCount });
}

// ─── Test 2: industry prefill ────────────────────────────────────────────────
const prefillCases = [
  { value: 'pharmacy', expect: 'pharmacy' },
  { value: 'clinic',   expect: 'clinic'   },
  { value: 'dental',   expect: 'dental'   },
  { value: 'optical',  expect: 'optical'  },
  { value: 'salon',    expect: 'salon'    },
  { value: 'other',    expect: 'other'    },
  { value: 'unknown',  expect: ''         }, // unknown은 비어 있어야 함
];
for (const c of prefillCases) {
  await page.goto(`${BASE_URL}/o4o/apply?industry=${c.value}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#apply-industry').waitFor({ state: 'visible', timeout: 15000 });
  const actual = await page.locator('#apply-industry').inputValue();
  record(
    `2.${c.value} ?industry=${c.value} → "${c.expect}"`,
    actual === c.expect ? 'PASS' : 'FAIL',
    { expected: c.expect, actual },
  );
}

// ─── Test 3: validation 차단 (필수 미입력) ────────────────────────────────────
{
  await page.goto(`${BASE_URL}/o4o/apply`, { waitUntil: 'domcontentloaded' });
  await page.locator('#apply-name').waitFor({ state: 'visible', timeout: 15000 });
  // 빈 form 제출 시도
  await page.locator('button[type=submit]').click();
  await page.waitForTimeout(300);
  // 에러 메시지가 나오는지 (이름 에러)
  const nameError = await page.locator('text=이름을 입력해 주세요.').isVisible();
  const consentError = await page.locator('text=개인정보 수집·이용에 동의해 주세요.').isVisible();
  record('3.empty 빈 form 제출 → 검증 차단', nameError && consentError ? 'PASS' : 'FAIL', { nameError, consentError });
}

// ─── Test 3.5: target page CTA → apply 진입 (6 target / 2 known + salon 신규) ───
{
  // SalonTargetPage 의 "내 미용실에 적용 검토" CTA href 확인
  await page.goto(`${BASE_URL}/o4o/targets/salon`, { waitUntil: 'domcontentloaded' });
  const salonCta = page.locator('a[href="/o4o/apply?industry=salon"]').first();
  const salonCtaCount = await salonCta.count();
  record('3.5.salon /o4o/targets/salon → apply CTA 존재', salonCtaCount > 0 ? 'PASS' : 'FAIL', { count: salonCtaCount });

  if (salonCtaCount > 0) {
    // 클릭 후 navigate 결과 검증
    await salonCta.click();
    await page.waitForURL(/\/o4o\/apply\?industry=salon/, { timeout: 10000 }).catch(() => {});
    const finalUrl = page.url();
    const onApply = finalUrl.includes('/o4o/apply') && finalUrl.includes('industry=salon');
    record('3.5.salon CTA 클릭 → /o4o/apply?industry=salon 도착', onApply ? 'PASS' : 'FAIL', { finalUrl });

    // 그리고 industry select 가 salon 으로 prefill
    await page.locator('#apply-industry').waitFor({ state: 'visible', timeout: 10000 });
    const industryValue = await page.locator('#apply-industry').inputValue();
    record('3.5.salon prefill = salon', industryValue === 'salon' ? 'PASS' : 'FAIL', { actual: industryValue });
  }
}

// ─── Test 4: /privacy 링크 ────────────────────────────────────────────────────
{
  await page.goto(`${BASE_URL}/o4o/apply`, { waitUntil: 'domcontentloaded' });
  await page.locator('#apply-consent').waitFor({ state: 'visible', timeout: 15000 });
  const privacyLink = page.locator('a[href="/privacy"][target="_blank"]').first();
  const exists = await privacyLink.count();
  record('4. /privacy 링크 (target=_blank) 존재', exists > 0 ? 'PASS' : 'FAIL', { count: exists });
}

// ─── Test 5: 실제 POST 제출 + payload 검증 + success panel (옵션) ────────────
if (DO_SUBMIT) {
  await page.goto(`${BASE_URL}/o4o/apply?industry=pharmacy`, { waitUntil: 'domcontentloaded' });
  await page.locator('#apply-name').waitFor({ state: 'visible', timeout: 15000 });

  // 사용자 제공 테스트 데이터
  await page.locator('#apply-name').fill('O4O 테스트');
  await page.locator('#apply-company').fill('테스트 사업자');
  await page.locator('#apply-phone').fill('010-0000-0000');
  await page.locator('#apply-email').fill('test@example.com');
  await page.locator('#apply-businessType').selectOption('협동조합·협회');
  // industry는 prefill 로 'pharmacy' 상태
  await page.locator('#apply-purpose').selectOption('O4O 적용 가능성 검토');
  await page.locator('#apply-message').fill('배포 검증용 테스트 문의입니다. 실제 상담 요청이 아닙니다.');
  await page.locator('#apply-consent').check();

  // 네트워크 요청 capture
  const responsePromise = page.waitForResponse((r) => r.url().includes('/api/v1/platform/inquiries') && r.request().method() === 'POST', { timeout: 15000 });
  await page.locator('button[type=submit]').click();
  let resp;
  let payload = null;
  let inquiryId = null;
  try {
    resp = await responsePromise;
    const req = resp.request();
    try { payload = JSON.parse(req.postData() || '{}'); } catch { payload = null; }
  } catch (err) {
    record('5.request POST /api/v1/platform/inquiries 도달', 'FAIL', { error: String(err) });
  }

  if (resp) {
    const status = resp.status();
    record('5.status POST 응답 201', status === 201 ? 'PASS' : 'FAIL', { status });

    // payload 검증
    if (payload) {
      const payloadChecks = {
        type: payload.type === 'platform',
        source: payload.source === 'neture_o4o_apply:pharmacy',
        subject: payload.subject === '[O4O 적용 문의] O4O 적용 가능성 검토',
        message_metadata: typeof payload.message === 'string' && payload.message.includes('[O4O 적용 문의 정보]') && payload.message.includes('관심 업종: 약국'),
        message_body: typeof payload.message === 'string' && payload.message.includes('배포 검증용 테스트 문의'),
        name: payload.name === 'O4O 테스트',
        company: payload.company === '테스트 사업자',
        email: payload.email === 'test@example.com',
      };
      for (const [k, v] of Object.entries(payloadChecks)) {
        record(`6.payload.${k}`, v ? 'PASS' : 'FAIL', v ? {} : { payload: payload[k.split('_')[0]] ?? null });
      }
    }

    // 응답 body 에서 inquiryId 추출
    try {
      const body = await resp.json();
      inquiryId = body?.data?.id;
    } catch {}
  }

  // success panel + 문의 ID
  await page.waitForTimeout(500);
  const successHeading = await page.locator('text=문의가 접수되었습니다').isVisible().catch(() => false);
  record('7. 성공 패널 표시', successHeading ? 'PASS' : 'FAIL');
  if (inquiryId) {
    const idVisible = await page.locator(`text=${inquiryId}`).isVisible().catch(() => false);
    record(`9. 문의 ID 표시 (${inquiryId.slice(0, 8)}…)`, idVisible ? 'PASS' : 'FAIL');
  } else {
    record('9. 문의 ID 표시', 'SKIP', { reason: 'inquiryId not captured' });
  }
}

// ─── Test 8: 콘솔 오류 ────────────────────────────────────────────────────────
record('8. 콘솔 오류 0', consoleErrors.length === 0 ? 'PASS' : 'FAIL', { count: consoleErrors.length, errors: consoleErrors.slice(0, 5) });
record('+. requestfailed 0', networkErrors.length === 0 ? 'PASS' : 'FAIL', { count: networkErrors.length, errors: networkErrors.slice(0, 5) });

// ─── 결과 요약 ────────────────────────────────────────────────────────────────
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const skip = results.filter((r) => r.status === 'SKIP').length;

const summary = {
  base_url: BASE_URL,
  do_submit: DO_SUBMIT,
  ran_at: new Date().toISOString(),
  total: results.length, pass, fail, skip,
  results,
  console_errors: consoleErrors,
  network_errors: networkErrors,
};
writeFileSync(`${OUT_DIR}/result.json`, JSON.stringify(summary, null, 2));
log('---');
log(`TOTAL ${results.length}: PASS ${pass} / FAIL ${fail} / SKIP ${skip}`);
log(`Result → ${OUT_DIR}/result.json`);

await browser.close();
process.exit(fail > 0 ? 1 : 0);
