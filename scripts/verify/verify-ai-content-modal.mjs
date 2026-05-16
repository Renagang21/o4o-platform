/**
 * CHECK-O4O-AI-CONTENT-MODAL-BROWSER-REAL-VERIFY-V1
 * Browser-based verification of AI lesson draft modal "URL에서 가져오기" tab.
 *
 * Run: node scripts/verify/verify-ai-content-modal.mjs
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE_URL = process.env.KPA_URL || 'https://kpa-society.co.kr';
const COURSE_EDIT_PATH = '/instructor/courses/77d530a0-1bb3-4e1b-be3f-691811c1c40e';
const TEST_EMAIL = 'phamacy1@o4o.com';
const TEST_PASSWORD = 'O4oTestPass@1';
const OUT_DIR = resolve('scripts/verify/output/ai-modal');

mkdirSync(OUT_DIR, { recursive: true });

const log = (...args) => console.log('[verify]', ...args);
const findings = {
  base_url: BASE_URL,
  started_at: new Date().toISOString(),
  steps: [],
  console_errors: [],
  console_warnings: [],
  network_errors: [],
};

const step = (name, data = {}) => {
  findings.steps.push({ name, at: new Date().toISOString(), ...data });
  log(`STEP: ${name}`, data);
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'ko-KR',
});
const page = await context.newPage();

page.on('console', (msg) => {
  const type = msg.type();
  const text = msg.text();
  if (type === 'error') findings.console_errors.push(text);
  else if (type === 'warning') findings.console_warnings.push(text);
});
page.on('pageerror', (err) => {
  findings.console_errors.push(`pageerror: ${err.message}`);
});
page.on('response', (resp) => {
  if (resp.status() >= 400) {
    findings.network_errors.push({ url: resp.url(), status: resp.status() });
  }
});

try {
  // 1) Open base URL
  step('navigate-base');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.screenshot({ path: `${OUT_DIR}/01-home.png`, fullPage: false });

  // 2) Open login modal — click any "로그인" link/button
  step('open-login-modal');
  const loginTrigger = await page.locator('text=/^로그인$/').first();
  await loginTrigger.waitFor({ timeout: 15000 });
  await loginTrigger.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/02-login-modal.png` });

  // 3) Click 약국 개설자 button to autofill, then submit
  step('click-test-account-button');
  const testBtn = page.locator('button:has-text("약국 개설자")');
  await testBtn.waitFor({ timeout: 10000 });
  await testBtn.click();
  await page.waitForTimeout(300);

  step('submit-login');
  // submit form via Enter or 로그인 submit button inside modal
  const submitBtn = page.locator('form button[type="submit"]:has-text("로그인")');
  await submitBtn.click();

  // Wait for either redirect or error
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.screenshot({ path: `${OUT_DIR}/03-after-login.png` });
  step('after-login', { url: page.url() });

  // 4) Navigate directly to provided course edit URL
  step('goto-course-edit');
  await page.goto(`${BASE_URL}${COURSE_EDIT_PATH}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT_DIR}/04-course-edit.png`, fullPage: true });
  step('course-edit-loaded', { url: page.url(), title: await page.title() });

  // Check for access-denied / login redirect
  const finalUrl = page.url();
  if (finalUrl.includes('/login') || !finalUrl.includes('/instructor/courses/')) {
    findings.access_denied = true;
    throw new Error(`Redirected away from course edit page: ${finalUrl}`);
  }

  // 5) Click "새 레슨 추가" button (scroll to bottom first)
  step('open-lesson-add-modal');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const addLessonCandidates = [
    'button:has-text("+ 새 레슨 추가")',
    'button:has-text("새 레슨 추가")',
    'button:has-text("+ 레슨 추가")',
    'button:has-text("레슨 추가")',
  ];
  let addClicked = false;
  for (const sel of addLessonCandidates) {
    const cnt = await page.locator(sel).count();
    if (cnt > 0) {
      step('clicking-lesson-add', { selector: sel, count: cnt });
      await page.locator(sel).first().click();
      addClicked = true;
      break;
    }
  }
  if (!addClicked) {
    findings.lesson_add_button_missing = true;
    await page.screenshot({ path: `${OUT_DIR}/05-no-lesson-add.png`, fullPage: true });
    throw new Error('레슨 추가 button not found on course edit page');
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT_DIR}/05-lesson-add-modal.png`, fullPage: true });

  // 6) Click "AI로 레슨 초안 만들기" inside the lesson-add modal
  step('click-ai-button');
  const aiBtnText = 'AI로 레슨 초안 만들기';
  const aiBtnCount = await page.locator(`button:has-text("${aiBtnText}")`).count();
  step('ai-button-count', { count: aiBtnCount });

  if (aiBtnCount === 0) {
    findings.ai_button_missing = true;
    await page.screenshot({ path: `${OUT_DIR}/06-no-ai-button.png`, fullPage: true });
    throw new Error('AI로 레슨 초안 만들기 button not found inside lesson-add modal');
  }

  await page.locator(`button:has-text("${aiBtnText}")`).first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT_DIR}/07-ai-modal-open.png`, fullPage: true });

  // 8) Inspect modal DOM
  step('inspect-modal');
  const dom = await page.evaluate(() => {
    // Find a modal-like container holding source-tab buttons
    const allButtons = Array.from(document.querySelectorAll('button'));
    const urlTabBtn = allButtons.find((b) => b.textContent?.trim() === 'URL에서 가져오기');
    const textTabBtn = allButtons.find((b) => b.textContent?.trim() === '기존 입력');

    const inspect = (el) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        textContent: el.textContent?.trim() || '',
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        in_viewport: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight,
        visibility: cs.visibility,
        display: cs.display,
        opacity: cs.opacity,
        zIndex: cs.zIndex,
        position: cs.position,
        background: cs.backgroundColor,
        color: cs.color,
        outerHTMLSnippet: el.outerHTML.slice(0, 400),
        ariaHidden: el.closest('[aria-hidden="true"]') ? true : false,
      };
    };

    const summarize = (el) => {
      if (!el) return null;
      // climb up to a likely modal container
      let p = el;
      let depth = 0;
      const trail = [];
      while (p && depth < 12) {
        const cs = getComputedStyle(p);
        trail.push({
          tag: p.tagName,
          id: p.id || null,
          cls: typeof p.className === 'string' ? p.className.slice(0, 120) : null,
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          overflow: cs.overflow,
          width: p.getBoundingClientRect().width,
          height: p.getBoundingClientRect().height,
        });
        p = p.parentElement;
        depth += 1;
      }
      return trail;
    };

    return {
      url_tab_button: inspect(urlTabBtn),
      text_tab_button: inspect(textTabBtn),
      url_tab_ancestor_chain: summarize(urlTabBtn),
      text_tab_ancestor_chain: summarize(textTabBtn),
      modal_html_substring_has_url_tab: document.body.innerHTML.includes('URL에서 가져오기'),
      modal_html_substring_has_text_tab: document.body.innerHTML.includes('기존 입력'),
      window_inner_size: { w: window.innerWidth, h: window.innerHeight },
      // capture all visible buttons inside any element with role=dialog or aria-modal
      dialog_buttons: (() => {
        const dialog = document.querySelector('[role="dialog"], [aria-modal="true"]')
          || document.querySelector('.modal')
          || null;
        if (!dialog) return null;
        return Array.from(dialog.querySelectorAll('button')).slice(0, 30).map((b) => b.textContent?.trim() || '');
      })(),
    };
  });

  findings.dom = dom;
  step('dom-captured');

  // Highlight URL tab if present and re-screenshot
  if (dom.url_tab_button) {
    await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const urlTabBtn = allButtons.find((b) => b.textContent?.trim() === 'URL에서 가져오기');
      if (urlTabBtn) {
        urlTabBtn.style.outline = '4px solid red';
        urlTabBtn.style.outlineOffset = '2px';
      }
    });
    await page.screenshot({ path: `${OUT_DIR}/08-url-tab-highlighted.png`, fullPage: true });
  }

  // 9) Hard reload test — close modal, navigate again
  step('hard-reload-test');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // re-click AI button
  const aiBtn2Count = await page.locator('text="AI 레슨 초안 만들기"').count();
  step('after-reload-ai-button-count', { count: aiBtn2Count });
  if (aiBtn2Count > 0) {
    await page.locator('text="AI 레슨 초안 만들기"').first().click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT_DIR}/09-after-reload-modal.png`, fullPage: true });
    const dom2 = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const urlTabBtn = allButtons.find((b) => b.textContent?.trim() === 'URL에서 가져오기');
      const textTabBtn = allButtons.find((b) => b.textContent?.trim() === '기존 입력');
      const inspect = (el) => {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          visible: cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0,
          in_viewport: rect.width > 0 && rect.height > 0,
        };
      };
      return {
        url_tab: inspect(urlTabBtn),
        text_tab: inspect(textTabBtn),
        active_tab_visible_first: (() => {
          // Heuristic: the more prominently-styled tab is the active one
          if (!urlTabBtn || !textTabBtn) return null;
          const u = getComputedStyle(urlTabBtn);
          const t = getComputedStyle(textTabBtn);
          return { url_bg: u.backgroundColor, text_bg: t.backgroundColor };
        })(),
      };
    });
    findings.dom_after_reload = dom2;
  }

} catch (err) {
  step('error', { message: err.message, stack: err.stack });
  findings.error = { message: err.message, stack: err.stack };
} finally {
  findings.finished_at = new Date().toISOString();
  writeFileSync(`${OUT_DIR}/findings.json`, JSON.stringify(findings, null, 2));
  log('Findings written to', `${OUT_DIR}/findings.json`);
  await browser.close();
}
