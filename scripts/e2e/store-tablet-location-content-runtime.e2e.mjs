// Tablet-viewport E2E — WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1 §23
// PC context (owner) + tablet context (fresh browser, 1280x800). Credentials from env.
import { chromium } from 'playwright';

const BASE = process.env.KPA_BASE || 'https://kpa-society.co.kr';
const EMAIL = process.env.KPA_EMAIL;
const PASS = process.env.KPA_PASS;
if (!EMAIL || !PASS) { console.error('KPA_EMAIL/KPA_PASS required'); process.exit(2); }
const OUT = process.env.OUT_DIR || '.';
const steps = [];
const log = (n, ok, msg) => { steps.push({ n, ok, msg }); console.log(`${ok ? 'PASS' : 'FAIL'} [${n}] ${msg}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page, returnTo) {
  await page.goto(`${BASE}/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('이메일을 입력하세요').fill(EMAIL);
  await page.getByPlaceholder('비밀번호를 입력하세요').fill(PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
}

const browser = await chromium.launch({ headless: true });
const pcCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
const pc = await pcCtx.newPage();
pc.on('console', (m) => { if (m.type() === 'error') console.log('  [pc console]', m.text().slice(0, 160)); });

const tabCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ko-KR', isMobile: false, hasTouch: true });
const tab = await tabCtx.newPage();
tab.on('console', (m) => { if (m.type() === 'error') console.log('  [tab console]', m.text().slice(0, 160)); });
const heartbeats = [];
tab.on('response', (r) => { if (r.url().includes('/tablet/device/heartbeat')) heartbeats.push({ t: Date.now(), status: r.status() }); });
tab.on('response', async (r) => { if (r.url().includes('/tablet-runtime/')) console.log('  [tab rt]', r.request().method(), r.url().split('/api/v1')[1], r.status(), r.status() >= 400 ? (await r.text().catch(() => '')).slice(0, 200) : ''); });

try {
  // ── 1. PC: owner login → 태블릿 관리 화면(위치별 운영)
  await login(pc, '/store/commerce/tablet-displays');
  await pc.goto(`${BASE}/store/commerce/tablet-displays`, { waitUntil: 'domcontentloaded' });
  await pc.getByRole('button', { name: '위치별 운영' }).waitFor({ timeout: 30000 });
  log(1, true, 'PC 경영자 로그인 → 태블릿 관리(위치별 운영 탭) 진입');
  // 이전 실행 잔여 기기 정리 (E2E 태블릿 이름의 연결 기기 전부 해제)
  pc.on('dialog', (d) => d.accept());
  for (let i = 0; i < 10; i++) {
    const stale = pc.locator('[data-testid^="device-row-"]').filter({ hasText: 'E2E 태블릿' }).first();
    if (!(await stale.isVisible().catch(() => false))) break;
    await stale.locator('[data-testid^="device-disconnect-"]').click();
    await sleep(1500);
  }

  // ── 2. 위치 2개 확보 (E2E-A-01 / E2E-A-02)
  const ensureLocation = async (name, code) => {
    if (await pc.getByText(code, { exact: true }).first().isVisible().catch(() => false)) return;
    const addBtn = pc.getByRole('button', { name: /위치 추가|추가/ }).first();
    await addBtn.click();
    await pc.getByPlaceholder('예: 카운터 · 영양제 진열대').fill(name);
    await pc.getByPlaceholder('예: A-01, 1층 카운터').fill(code);
    await pc.getByRole('button', { name: '위치 추가' }).last().click();
    await sleep(1500);
    // 등록 후 상세로 들어가므로 목록으로 복귀
    const back = pc.getByRole('button', { name: '위치 목록' });
    if (await back.isVisible().catch(() => false)) await back.click();
  };
  await ensureLocation('E2E 카운터', 'E2E-A-01');
  await ensureLocation('E2E 진열대', 'E2E-A-02');
  await pc.reload({ waitUntil: 'domcontentloaded' });
  await pc.getByText('E2E-A-01', { exact: true }).first().waitFor({ timeout: 30000 });
  await pc.getByText('E2E-A-02', { exact: true }).first().waitFor({ timeout: 30000 });
  log(2, true, '위치 2개(E2E-A-01 · E2E-A-02) 확보 — 자유 형식 위치 코드');

  // ── 3. [태블릿 연결] → 6자리 코드
  // E2E-A-01 카드의 [태블릿 연결] 버튼을 정확히 고른다 (카드 = 코드 텍스트와 pair 버튼을 함께 가진 가장 안쪽 요소)
  const cardA = pc.getByText('E2E-A-01', { exact: true }).first().locator('xpath=ancestor::*[count(.//*[starts-with(@data-testid,"pair-device-")])=1][1]');
  const pairBtn = cardA.locator('[data-testid^="pair-device-"]').first();
  const locAId = (await pairBtn.getAttribute('data-testid')).replace('pair-device-', '');
  await pairBtn.click();
  await pc.getByTestId('pairing-code-modal').waitFor({ timeout: 15000 });
  const code = (await pc.getByTestId('pairing-code-value').innerText()).trim();
  log(3, /^\d{6}$/.test(code), `연결 코드 발급 (6자리: ${/^\d{6}$/.test(code) ? 'OK' : code}) · 위치 ${locAId.slice(0, 8)}…`);
  await pc.screenshot({ path: `${OUT}/e2e-03-pairing-code.png` });
  await pc.getByRole('button', { name: '닫기' }).last().click();

  // ── 4. 태블릿: /tablet/setup → 코드 → 매장 확인 → 이름 → 위치 → 연결
  await tab.goto(`${BASE}/tablet/setup`, { waitUntil: 'domcontentloaded' });
  await tab.getByTestId('pairing-code-input').fill(code);
  await tab.getByTestId('pairing-lookup').click();
  await tab.getByTestId('pairing-store-name').waitFor({ timeout: 15000 });
  const storeName = await tab.getByTestId('pairing-store-name').innerText();
  await tab.getByTestId('pairing-device-name').fill('E2E 태블릿');
  await tab.getByTestId('pairing-claim').click();
  await tab.waitForURL(/\/tablet\/(?!setup)/, { timeout: 20000 });
  const slug = decodeURIComponent(new URL(tab.url()).pathname.replace('/tablet/', ''));
  log(4, true, `태블릿 온보딩 완료 → 매장 "${storeName}" · /tablet/${slug}`);

  // ── 5. 소비자 화면 + heartbeat + 직원 메뉴 버튼
  await tab.getByTestId('staff-menu-button').waitFor({ timeout: 30000 });
  await sleep(2000);
  const stored = await tab.evaluate(() => JSON.parse(localStorage.getItem('o4o.tablet.device') || 'null'));
  log(5, !!stored?.deviceToken && heartbeats.some((h) => h.status === 200), `소비자 화면 표시 · 기기 토큰 브라우저 저장 · heartbeat 200 (${heartbeats.length}회)`);
  await tab.screenshot({ path: `${OUT}/e2e-05-consumer.png` });

  // ── 6. 같은 코드 재사용 불가
  const reuse = await tab.evaluate(async ({ base, c }) => {
    const r = await fetch(`${base.replace('kpa-society.co.kr', 'api.neture.co.kr')}/api/v1/stores/tablet-pairing/lookup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: c }) }).catch(() => null);
    return r ? r.status : -1;
  }, { base: BASE, c: code });
  log(6, reuse === 404 || reuse === 409, `사용된 연결 코드 재사용 거부 (HTTP ${reuse})`);

  // ── 7. PC: 연결된 기기 표시
  await pc.reload({ waitUntil: 'domcontentloaded' });
  await pc.getByTestId('connected-devices').waitFor({ timeout: 30000 });
  const devRow = pc.locator('[data-testid^="device-row-"]').filter({ hasText: 'E2E 태블릿' }).first();
  await devRow.waitFor({ timeout: 15000 });
  const devId = (await devRow.getAttribute('data-testid')).replace('device-row-', '');
  const footerA = pc.getByTestId(`location-devices-${locAId}`);
  log(7, (await footerA.innerText()).includes('E2E 태블릿'), 'PC 위치 카드에 연결된 태블릿 이름·접속 시각 표시 + 연결 기기 목록');
  await pc.screenshot({ path: `${OUT}/e2e-07-pc-devices.png` });

  // ── 8. PC: 콘텐츠 탭 — 복제 · 이름/설명 · 상품 빠른 수정 메뉴
  await pc.getByRole('button', { name: '태블릿 콘텐츠' }).click();
  await sleep(2500);
  const kebab = pc.locator('table tbody tr').first().locator('button[aria-haspopup], button:has(svg)').last();
  await kebab.click();
  const menuText = await pc.locator('[role="menu"], [role="menuitem"]').first().locator('xpath=ancestor-or-self::*[@role="menu"]').innerText().catch(async () => (await pc.locator('body').innerText()));
  const hasDup = menuText.includes('복제'), hasQuick = menuText.includes('상품 빠른 수정'), hasRename = menuText.includes('이름 · 설명 변경');
  log(8, hasDup && hasQuick && hasRename, `콘텐츠 행 메뉴에 복제/상품 빠른 수정/이름·설명 변경 노출 (${hasDup},${hasQuick},${hasRename})`);
  const beforeRows = await pc.locator('table tbody tr').count();
  await pc.getByRole('menuitem', { name: '복제' }).first().click().catch(() => pc.getByText('복제', { exact: true }).first().click());
  await sleep(3000);
  const afterRows = await pc.locator('table tbody tr').count();
  const dupVisible = await pc.getByText('(복사)').first().isVisible().catch(() => false);
  log(9, dupVisible || afterRows > beforeRows, `콘텐츠 복제 → 목록에 "(복사)" 새 항목 (${beforeRows}→${afterRows})`);
  await pc.screenshot({ path: `${OUT}/e2e-09-duplicate.png` });

  // 이름·설명 변경 (복사본)
  const dupRow = pc.locator('table tbody tr').filter({ hasText: '(복사)' }).first();
  await dupRow.locator('button:has(svg)').last().click();
  await pc.getByText('이름 · 설명 변경', { exact: true }).first().click();
  await pc.getByTestId('content-rename-modal').waitFor({ timeout: 10000 });
  await pc.getByTestId('content-rename-name').fill('E2E 복제 콘텐츠');
  await pc.getByTestId('content-rename-description').fill('E2E 설명 — 직원 화면에서 보임');
  await pc.getByTestId('content-rename-save').click();
  await sleep(2500);
  log(10, await pc.getByText('E2E 복제 콘텐츠').first().isVisible().catch(() => false), '이름·설명 변경 저장 → 목록 반영');

  // 상품 빠른 수정 모달 열림
  const e2eRow = pc.locator('table tbody tr').filter({ hasText: 'E2E 복제 콘텐츠' }).first();
  await e2eRow.locator('button:has(svg)').last().click();
  await pc.getByText('상품 빠른 수정', { exact: true }).first().click();
  await pc.getByTestId('product-quick-editor').waitFor({ timeout: 15000 });
  await sleep(2000);
  const poolCount = await pc.locator('[data-testid="quick-editor-pool"] li button').count();
  if (poolCount > 0) await pc.locator('[data-testid="quick-editor-pool"] li button').first().click();
  await pc.getByTestId('quick-editor-save').click();
  await sleep(2500);
  log(11, !(await pc.getByTestId('product-quick-editor').isVisible().catch(() => false)), `PC 상품 빠른 수정 저장 (pool ${poolCount}, 추가 ${poolCount > 0 ? 1 : 0})`);

  // ── 11b. PC: 위치 E2E-A-02 에 콘텐츠 2개 연결(태블릿에 적용 = current 적용 + corner_contents 연결). 직원은 연결된 콘텐츠 안에서만 전환.
  let linked = 0;
  for (let i = 0; i < 2; i++) {
    const row = pc.locator('table tbody tr').filter({ hasText: '사용 가능' }).filter({ hasNotText: '복사' }).filter({ hasNotText: 'E2E' }).nth(i);
    if (!(await row.isVisible().catch(() => false))) break;
    await row.locator('button:has(svg)').last().click();
    await pc.getByRole('menuitem', { name: '태블릿에 적용' }).first().click().catch(() => pc.getByText('태블릿에 적용', { exact: true }).first().click());
    const target = pc.locator('li button').filter({ hasText: 'E2E-A-02' }).first();
    await target.waitFor({ timeout: 15000 });
    if (await target.isEnabled()) { await target.click(); linked++; await sleep(2000); }
    else { await pc.keyboard.press('Escape'); await sleep(500); }
    if (await pc.getByText('태블릿에 적용', { exact: true }).first().isVisible().catch(() => false)) { await pc.keyboard.press('Escape'); await sleep(500); }
  }
  log('11b', linked >= 1, `PC 에서 위치 E2E-A-02 에 콘텐츠 연결·적용 (${linked}건)`);

  // ── 12. 태블릿: 직원 메뉴 → 로그인 → 직원 화면
  await tab.getByTestId('staff-menu-button').click();
  await tab.waitForURL(/\/login/, { timeout: 15000 });
  await tab.getByPlaceholder('이메일을 입력하세요').fill(EMAIL);
  await tab.getByPlaceholder('비밀번호를 입력하세요').fill(PASS);
  await tab.locator('button[type="submit"]').first().click();
  await tab.getByTestId('staff-panel').waitFor({ timeout: 30000 });
  await tab.getByTestId('staff-device-name').waitFor({ timeout: 15000 });
  const devName = await tab.getByTestId('staff-device-name').innerText();
  const curLoc = await tab.getByTestId('staff-current-location').innerText();
  log(12, devName.includes('E2E 태블릿'), `직원 메뉴 → 로그인 → 직원 화면 (기기 ${devName.trim()} · 위치 ${curLoc.trim()})`);
  await tab.screenshot({ path: `${OUT}/e2e-12-staff-home.png` });

  // ── 13. 위치 변경 → E2E-A-02
  await tab.getByTestId('staff-change-location').click();
  await tab.getByTestId('staff-location-list').waitFor({ timeout: 15000 });
  const locB = tab.locator('button[data-testid^="staff-location-"]').filter({ hasText: 'E2E-A-02' }).first();
  await locB.click();
  await sleep(2500);
  const curLoc2 = await tab.getByTestId('staff-current-location').innerText();
  log(13, curLoc2.includes('E2E-A-02'), `직원 위치 변경 → ${curLoc2.trim()}`);

  // ── 14. 콘텐츠 변경 (E2E 복제 콘텐츠는 draft → disabled 확인, 다른 active 선택)
  await tab.getByTestId('staff-change-content').click();
  await tab.getByTestId('staff-content-list').waitFor({ timeout: 15000 });
  const items = tab.locator('button[data-testid^="staff-content-"]');
  const n = await items.count();
  let picked = null;
  for (let i = 0; i < n; i++) {
    const it = items.nth(i);
    if (await it.isEnabled()) { picked = (await it.innerText()).split('\n')[0]; await it.click(); break; }
  }
  await sleep(2500);
  const curContent = await tab.getByTestId('staff-current-content').innerText();
  log(14, !!picked && curContent.includes(picked.trim().slice(0, 8)), `직원 콘텐츠 변경 → "${curContent.trim()}" (후보 ${n})`);
  await tab.screenshot({ path: `${OUT}/e2e-14-staff-content.png` });

  // ── 15. 직원 상품 수정 모달
  await tab.getByTestId('staff-edit-products').click();
  await tab.getByTestId('product-quick-editor').waitFor({ timeout: 15000 });
  await sleep(1500);
  const selCount = await tab.locator('[data-testid="quick-editor-selected"] li').count();
  log(15, true, `직원 상품 수정 모달 열림 (현재 표시 상품 ${selCount})`);
  await tab.getByRole('button', { name: '취소' }).click();

  // ── 16. 소비자 화면 복귀 + heartbeat 로 화면 자동 갱신
  const hbBefore = heartbeats.length;
  await tab.getByTestId('staff-back-to-consumer').click();
  await sleep(17000);
  const consumerVisible = await tab.getByTestId('staff-menu-button').isVisible();
  const panelHidden = !(await tab.getByTestId('staff-panel').isVisible().catch(() => false));
  log(16, consumerVisible && panelHidden && heartbeats.length > hbBefore, `소비자 화면 복귀 · heartbeat 계속(${hbBefore}→${heartbeats.length})`);

  // ── 17. PC: 기기 위치 = E2E-A-02 반영 → PC 에서 위치 이동(E2E-A-01) → 태블릿 heartbeat 반영 → 연결 해제 → 태블릿 401
  await pc.getByRole('button', { name: '위치별 운영' }).click();
  await pc.reload({ waitUntil: 'domcontentloaded' });
  await pc.getByTestId(`device-move-${devId}`).waitFor({ timeout: 30000 });
  const sel = pc.getByTestId(`device-move-${devId}`);
  const selText = await sel.locator('option:checked').innerText();
  await sel.selectOption(locAId);
  await sleep(2500);
  const movedText = await pc.getByTestId(`device-move-${devId}`).locator('option:checked').innerText();
  const locBefore = await tab.evaluate(() => JSON.parse(localStorage.getItem('o4o.tablet.device') || '{}').locationId);
  await sleep(17000);
  const hbLast = heartbeats[heartbeats.length - 1];
  log(17, selText.includes('E2E-A-02') && movedText.includes('E2E-A-01') && hbLast?.status === 200, `PC 기기 목록: 직원 이동 결과(${selText}) 반영 → PC 위치 이동(${movedText}) → 태블릿 heartbeat 계속 200`);
  await pc.screenshot({ path: `${OUT}/e2e-17-pc-move.png` });

  await pc.getByTestId(`device-disconnect-${devId}`).click();
  pc.once('dialog', (d) => d.accept());
  await sleep(2500);
  await sleep(17000);
  const hb401 = heartbeats.slice(-2).some((h) => h.status === 401);
  const staffBtnGone = !(await tab.getByTestId('staff-menu-button').isVisible().catch(() => false));
  log(18, hb401 && staffBtnGone, `PC 연결 해제 → 태블릿 heartbeat 401 → 기기 정보 삭제(직원 메뉴 버튼 사라짐)`);
  await tab.screenshot({ path: `${OUT}/e2e-18-disconnected.png` });
} catch (e) {
  log(99, false, `예외: ${e?.message?.slice(0, 300)}`);
  await pc.screenshot({ path: `${OUT}/e2e-fail-pc.png` }).catch(() => {});
  await tab.screenshot({ path: `${OUT}/e2e-fail-tab.png` }).catch(() => {});
} finally {
  await browser.close();
  const fails = steps.filter((s) => !s.ok);
  console.log(`\nRESULT: ${steps.length - fails.length}/${steps.length} PASS${fails.length ? ` · FAIL: ${fails.map((f) => f.n).join(',')}` : ''}`);
  process.exit(fails.length ? 1 : 0);
}
