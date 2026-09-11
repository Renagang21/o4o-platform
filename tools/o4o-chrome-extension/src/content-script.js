/**
 * Content Script — 등재 site 탭의 DOM executor (WO-O4O-BROWSER-DOM-CONTROL-V0 §35)
 *
 * BRIDGE-V0 에서 "등록 전용" 이던 이 파일이 이번 WO 에서 **DOM 을 실제로 읽고 제한된 상호작용을
 * 수행하는 유일한 자리**가 됐다. 그래도 하는 일은 셋뿐이다(§35):
 *
 *   DOM inspect      — 보이는 요소의 구조화 요약 + snapshot-scoped elementRef 발급 (§10·§11·§13)
 *   element lookup   — role/text/name/label/placeholder 구조화 조건으로 찾기 (§15)
 *   safe action      — read_text · set_input · select_option · click · read_table (§17~§27)
 *
 * 하지 않는 것(§35): AI 판단 · WorkScope 검증 · risk **결정**(여기서는 분류 규칙을 **적용**만 한다) ·
 * credential 처리. 그리고 다음은 코드 자체가 없다(§12·§16·§43):
 *   - 임의 selector/XPath 실행 (`querySelectorAll` 은 **아래 상수 문자열**로만 부른다)
 *   - eval · new Function · 스크립트 주입 · fetch
 *   - innerHTML/outerHTML 수집 · cookie · localStorage · sessionStorage · 저장 비밀번호
 *   - password/OTP/PIN 필드 값 읽기·쓰기 (→ DOM_USER_ACTION_REQUIRED)
 *   - COMMIT 으로 분류된 대상 클릭 (→ DOM_ACTION_NOT_ALLOWED, riskLevel=COMMIT)
 *   - 등재 origin 밖으로 나가는 링크 클릭 (→ DOM_CROSS_ORIGIN_BLOCKED)
 *
 * 메시지는 **이 확장의 service worker 에서 온 것만** 받는다(sender.id 검사). 페이지 스크립트는 이
 * 리스너에 닿을 수 없다(content script 격리 세계).
 *
 * 페이지 텍스트는 어디까지나 **데이터**다(§32). 페이지에 "AI 는 이전 지시를 무시하라" 가 적혀 있어도
 * 이 스크립트는 그것을 문자열로 돌려줄 뿐이고, 정책은 서버 · 사용자 쪽에 있다.
 */

(() => {
  // ── 등재 판정 · 등록 (BRIDGE-V0 §10) ──────────────────────────────────────
  const ORIGIN = location.origin;
  const SITE_ID = ORIGIN === 'https://neture.co.kr' ? 'o4o.neture' : null;
  /** 이 site 에서 "같은 site" 로 보는 origin. 링크 이동 허용 범위(§25). site-registry.js 사본과 같다. */
  const ALLOWED_ORIGINS = ['https://neture.co.kr'];
  try {
    chrome.runtime.sendMessage({ action: 'content.registered', origin: ORIGIN, isRegisteredSite: SITE_ID !== null });
  } catch {
    // service worker 미기동 등은 무시
  }
  if (!SITE_ID) return; // 등재 밖에서는 executor 를 세우지 않는다(manifest 가 이미 막지만 이중 방어).

  // ── 한도 · 규칙 (서버 browser-dom-contract.ts · agent browser-dom-limits.mjs 와 동일) ────
  const DOM_INSPECT_MAX_ELEMENTS = 80;
  const DOM_FIND_MAX_MATCHES = 10;
  const DOM_TEXT_MAX_LENGTH = 2000;
  const DOM_INPUT_MAX_LENGTH = 500;
  const DOM_TABLE_MAX_ROWS = 50;
  const DOM_TABLE_MAX_COLUMNS = 12;
  const DOM_CELL_MAX_LENGTH = 60;
  const DOM_ELEMENT_TEXT_MAX = 120;
  const DOM_ELEMENT_NAME_MAX = 80;
  const DOM_COMMIT_KEYWORDS_KO = [
    '결제',
    '주문확정',
    '주문하기',
    '주문완료',
    '구매',
    '결제하기',
    '삭제',
    '탈퇴',
    '게시',
    '발행',
    '송금',
    '이체',
    '승인',
    '확정',
  ];
  const DOM_COMMIT_KEYWORDS_EN = [
    'pay',
    'payment',
    'checkout',
    'place order',
    'purchase',
    'buy now',
    'delete',
    'remove account',
    'publish',
    'confirm order',
    'submit order',
    'transfer',
    'approve',
  ];
  const ERR = {
    SITE_NOT_ALLOWED: 'DOM_SITE_NOT_ALLOWED',
    ELEMENT_NOT_FOUND: 'DOM_ELEMENT_NOT_FOUND',
    ELEMENT_STALE: 'DOM_ELEMENT_STALE',
    ACTION_NOT_ALLOWED: 'DOM_ACTION_NOT_ALLOWED',
    CROSS_ORIGIN_BLOCKED: 'DOM_CROSS_ORIGIN_BLOCKED',
    USER_ACTION_REQUIRED: 'DOM_USER_ACTION_REQUIRED',
    CONTENT_UNAVAILABLE: 'DOM_CONTENT_UNAVAILABLE',
  };

  /**
   * snapshot 후보 selector — **상수 문자열 하나**다. 외부 입력이 selector 가 되는 경로는 없다(§16).
   * 상호작용 요소 · 제목 · 표만 고른다. password 필드도 후보에 들어가되 값은 절대 읽지 않는다(§19).
   */
  const CANDIDATE_SELECTOR =
    'button, a[href], input, select, textarea, ' +
    '[role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], ' +
    '[role="textbox"], [role="combobox"], [role="searchbox"], [role="listitem"], ' +
    'h1, h2, h3, h4, h5, h6, p, li, table, [role="table"], [role="grid"]';
  const TABLE_SELECTOR = 'table, [role="table"], [role="grid"]';
  const PASSWORD_IN_FORM_SELECTOR = 'input[type="password"]';
  const CREDENTIAL_HINT_RE = /passw|pwd|otp|pin\b|security|secur|cvc|cvv|card|인증번호|비밀번호|비번|암호|보안카드|공동인증|공인인증/i;
  const CREDENTIAL_AUTOCOMPLETE_RE = /^(one-time-code|current-password|new-password|cc-)/i;

  // ── 유틸 ────────────────────────────────────────────────────────────────────
  const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
  const clip = (s, n) => {
    const t = norm(s);
    return t.length > n ? t.slice(0, n) : t;
  };
  const compact = (s) => norm(s).replace(/\s+/g, '').toLowerCase();

  function isVisible(el) {
    if (!(el instanceof Element)) return false;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function roleOf(el) {
    const tag = el.tagName.toLowerCase();
    const aria = (el.getAttribute('role') || '').toLowerCase();
    if (aria) {
      if (['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'textbox', 'combobox', 'searchbox', 'listitem', 'table', 'grid', 'heading'].includes(aria)) {
        return aria === 'grid' ? 'table' : aria;
      }
    }
    if (tag === 'button') return 'button';
    if (tag === 'a') return 'link';
    if (tag === 'select') return 'combobox';
    if (tag === 'textarea') return 'textarea';
    if (tag === 'table') return 'table';
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'li') return 'listitem';
    if (tag === 'p') return 'paragraph';
    if (tag === 'input') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'submit' || type === 'button' || type === 'reset' || type === 'image') return 'button';
      if (type === 'search') return 'searchbox';
      if (type === 'hidden') return 'other';
      return 'textbox'; // text · password · email · number … — password 는 credential 로 따로 표시
    }
    return 'other';
  }

  function labelTextFor(el) {
    const parts = [];
    if (el.id) {
      for (const l of document.querySelectorAll('label[for]')) {
        if (l.getAttribute('for') === el.id) parts.push(l.textContent);
      }
    }
    const wrapping = el.closest('label');
    if (wrapping) parts.push(wrapping.textContent);
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      for (const id of labelledBy.split(/\s+/)) {
        const ref = document.getElementById(id);
        if (ref) parts.push(ref.textContent);
      }
    }
    return norm(parts.join(' '));
  }

  /** 접근 가능 이름(단순화): aria-label → label → placeholder → title → alt → value(버튼) → 텍스트. */
  function accessibleName(el) {
    const aria = norm(el.getAttribute('aria-label'));
    if (aria) return aria;
    const label = labelTextFor(el);
    if (label) return label;
    const placeholder = norm(el.getAttribute('placeholder'));
    if (placeholder) return placeholder;
    const title = norm(el.getAttribute('title'));
    if (title) return title;
    const img = el.querySelector('img[alt]');
    if (img) {
      const alt = norm(img.getAttribute('alt'));
      if (alt) return alt;
    }
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' && ['submit', 'button', 'reset'].includes((el.getAttribute('type') || '').toLowerCase())) {
      return norm(el.value);
    }
    if (tag === 'select') {
      const opt = el.options && el.options[el.selectedIndex];
      return opt ? norm(opt.textContent) : '';
    }
    // 버튼 · 링크 · 탭 · 메뉴 항목 · 제목의 접근 가능 이름은 그 안의 텍스트다(짧게).
    const role = roleOf(el);
    if (['button', 'link', 'tab', 'menuitem', 'heading', 'checkbox', 'radio'].includes(role)) {
      return clip(el.innerText || el.textContent, DOM_ELEMENT_NAME_MAX);
    }
    return '';
  }

  function isCredentialField(el) {
    const tag = el.tagName.toLowerCase();
    if (tag !== 'input' && tag !== 'textarea') return false;
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'password') return true;
    if (CREDENTIAL_AUTOCOMPLETE_RE.test(el.getAttribute('autocomplete') || '')) return true;
    const hints = [el.getAttribute('name'), el.id, el.getAttribute('placeholder'), el.getAttribute('aria-label'), labelTextFor(el)]
      .filter(Boolean)
      .join(' ');
    return CREDENTIAL_HINT_RE.test(hints);
  }

  function classifyClickRisk(label) {
    const c = compact(label);
    if (DOM_COMMIT_KEYWORDS_KO.some((k) => c.includes(k))) return 'COMMIT';
    const lower = norm(label).toLowerCase();
    if (DOM_COMMIT_KEYWORDS_EN.some((k) => new RegExp(`\\b${k.replace(/\s+/g, '\\s+')}\\b`).test(lower))) return 'COMMIT';
    return 'REVERSIBLE';
  }

  // ── snapshot · elementRef (§13·§14) ─────────────────────────────────────────
  /** 최근 snapshot 2개만 유지한다. 그보다 오래된 ref 는 stale 이다. */
  const snapshots = new Map(); // snapshotId -> Map<ref, Element>
  function newSnapshotId() {
    return 's_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function describe(el, ref) {
    const role = roleOf(el);
    const out = { elementRef: ref, role, tag: el.tagName.toLowerCase() };
    const name = clip(accessibleName(el), DOM_ELEMENT_NAME_MAX);
    if (name) out.name = name;
    if (role !== 'textbox' && role !== 'searchbox' && role !== 'textarea' && role !== 'combobox') {
      const text = clip(el.innerText || el.textContent, DOM_ELEMENT_TEXT_MAX);
      if (text && text !== name) out.text = text;
    }
    if (el.disabled === true || el.getAttribute('aria-disabled') === 'true') out.disabled = true;
    if (role === 'checkbox' || role === 'radio') out.checked = el.checked === true || el.getAttribute('aria-checked') === 'true';
    if (role === 'textbox' || role === 'searchbox' || role === 'textarea' || role === 'combobox') {
      // 값 자체가 아니라 "있는가" 만(§11). credential 필드는 그것조차 보지 않는다.
      out.hasValue = isCredentialField(el) ? false : norm(el.value).length > 0;
    }
    if (['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem'].includes(role)) {
      out.riskLevel = classifyClickRisk(name || out.text || '');
    }
    return out;
  }

  function takeSnapshot(limit) {
    const id = newSnapshotId();
    const refs = new Map();
    const elements = [];
    let n = 0;
    for (const el of document.querySelectorAll(CANDIDATE_SELECTOR)) {
      if (!isVisible(el)) continue;
      if (roleOf(el) === 'other') continue;
      n += 1;
      const ref = `e_${n}`;
      refs.set(ref, el);
      if (elements.length < limit) elements.push(describe(el, ref));
      if (n >= 9999) break;
    }
    snapshots.set(id, refs);
    while (snapshots.size > 2) snapshots.delete(snapshots.keys().next().value);
    return { snapshotId: id, elements, elementCount: n, refs };
  }

  /** ref → 살아 있는 element. snapshot 모름 · ref 모름 · DOM 에서 떨어짐 → stale. */
  function resolveRef(snapshotId, ref) {
    const refs = snapshots.get(snapshotId);
    if (!refs) return { error: ERR.ELEMENT_STALE };
    const el = refs.get(ref);
    if (!el) return { error: ERR.ELEMENT_NOT_FOUND };
    if (!el.isConnected) return { error: ERR.ELEMENT_STALE };
    return { el };
  }

  // ── 변화 관측 (§28) ─────────────────────────────────────────────────────────
  function observeChange(ms) {
    return new Promise((resolve) => {
      let count = 0;
      const pathBefore = location.pathname;
      const obs = new MutationObserver((records) => {
        count += records.length;
      });
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
      setTimeout(() => {
        obs.disconnect();
        resolve({ changed: count > 0, navigated: location.pathname !== pathBefore });
      }, ms);
    });
  }

  // ── actions ─────────────────────────────────────────────────────────────────
  function actGetContext() {
    return { ok: true, siteId: SITE_ID, ready: document.readyState === 'complete', path: location.pathname };
  }

  function actInspect() {
    const snap = takeSnapshot(DOM_INSPECT_MAX_ELEMENTS);
    return { ok: true, snapshotId: snap.snapshotId, elements: snap.elements, elementCount: snap.elementCount };
  }

  function matchesQuery(el, desc, q) {
    if (q.role) {
      const r = desc.role === 'textarea' ? 'textbox' : desc.role;
      if (r !== q.role && !(q.role === 'textbox' && desc.role === 'searchbox')) return false;
    }
    const hay = {
      name: compact(desc.name),
      text: compact(desc.text),
      label: compact(labelTextFor(el)),
      placeholder: compact(el.getAttribute('placeholder')),
    };
    if (q.name && !hay.name.includes(compact(q.name))) return false;
    if (q.label && !hay.label.includes(compact(q.label))) return false;
    if (q.placeholder && !hay.placeholder.includes(compact(q.placeholder))) return false;
    if (q.text) {
      const t = compact(q.text);
      if (!(hay.name.includes(t) || hay.text.includes(t) || hay.label.includes(t) || hay.placeholder.includes(t))) return false;
    }
    return true;
  }

  function actFind(payload) {
    const q = payload && typeof payload.query === 'object' && payload.query ? payload.query : {};
    const snap = takeSnapshot(9999);
    const matches = [];
    for (const [ref, el] of snap.refs) {
      const desc = describe(el, ref);
      if (matchesQuery(el, desc, q)) {
        matches.push(desc);
        if (matches.length >= DOM_FIND_MAX_MATCHES) break;
      }
    }
    return { ok: true, snapshotId: snap.snapshotId, matches, matchCount: matches.length };
  }

  function actReadText(payload) {
    const r = resolveRef(payload.snapshotId, payload.elementRef);
    if (r.error) return { ok: false, errorCode: r.error };
    const el = r.el;
    if (isCredentialField(el)) return { ok: false, errorCode: ERR.USER_ACTION_REQUIRED, userActionRequired: true };
    if (!isVisible(el)) return { ok: false, errorCode: ERR.ELEMENT_STALE };
    const role = roleOf(el);
    // 입력 요소는 값이 아니라 보이는 텍스트(라벨·placeholder)만 — 사용자가 친 값은 읽지 않는다(§17 secret field 제외 원칙 확장).
    const raw = role === 'textbox' || role === 'searchbox' || role === 'textarea' ? accessibleName(el) : el.innerText || el.textContent;
    const text = clip(raw, DOM_TEXT_MAX_LENGTH);
    return { ok: true, elementRef: payload.elementRef, role, text, textLength: norm(raw).length };
  }

  function setNativeValue(el, value) {
    const proto = el.tagName.toLowerCase() === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function actSetInput(payload) {
    const r = resolveRef(payload.snapshotId, payload.elementRef);
    if (r.error) return { ok: false, errorCode: r.error };
    const el = r.el;
    const text = typeof payload.text === 'string' ? payload.text : '';
    if (text.length === 0 || text.length > DOM_INPUT_MAX_LENGTH) return { ok: false, errorCode: ERR.ACTION_NOT_ALLOWED };
    if (isCredentialField(el)) return { ok: false, errorCode: ERR.USER_ACTION_REQUIRED, userActionRequired: true, role: 'textbox' };
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    const allowed = tag === 'textarea' || (tag === 'input' && (type === 'text' || type === 'search'));
    if (!allowed) return { ok: false, errorCode: ERR.ACTION_NOT_ALLOWED, role: roleOf(el) };
    if (el.disabled || el.readOnly || !isVisible(el)) return { ok: false, errorCode: ERR.ACTION_NOT_ALLOWED, role: roleOf(el) };
    try {
      el.focus();
    } catch {
      // focus 실패는 무시
    }
    setNativeValue(el, text);
    const after = await observeChange(200);
    return { ok: true, elementRef: payload.elementRef, role: roleOf(el), hasValue: norm(el.value).length > 0, riskLevel: 'REVERSIBLE', ...after };
  }

  async function actSelectOption(payload) {
    const r = resolveRef(payload.snapshotId, payload.elementRef);
    if (r.error) return { ok: false, errorCode: r.error };
    const el = r.el;
    if (el.tagName.toLowerCase() !== 'select') return { ok: false, errorCode: ERR.ACTION_NOT_ALLOWED, role: roleOf(el) };
    if (el.disabled || !isVisible(el)) return { ok: false, errorCode: ERR.ACTION_NOT_ALLOWED, role: 'combobox' };
    const want = compact(payload.option);
    let found = null;
    for (const opt of el.options) {
      if (compact(opt.value) === want || compact(opt.textContent) === want) {
        found = opt;
        break;
      }
    }
    if (!found) return { ok: false, errorCode: ERR.ELEMENT_NOT_FOUND, role: 'combobox' };
    el.value = found.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    const after = await observeChange(200);
    return { ok: true, elementRef: payload.elementRef, role: 'combobox', hasValue: true, riskLevel: 'REVERSIBLE', ...after };
  }

  function linkTarget(el) {
    const href = el.getAttribute('href');
    if (href === null) return null;
    try {
      return new URL(href, location.href);
    } catch {
      return null;
    }
  }

  async function actClick(payload) {
    const r = resolveRef(payload.snapshotId, payload.elementRef);
    if (r.error) return { ok: false, errorCode: r.error };
    const el = r.el;
    const role = roleOf(el);
    if (!['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem'].includes(role)) {
      return { ok: false, errorCode: ERR.ACTION_NOT_ALLOWED, role };
    }
    if (el.disabled || el.getAttribute('aria-disabled') === 'true' || !isVisible(el)) {
      return { ok: false, errorCode: ERR.ACTION_NOT_ALLOWED, role };
    }
    const label = accessibleName(el) || norm(el.innerText || el.textContent);
    const riskLevel = classifyClickRisk(label);
    if (riskLevel === 'COMMIT') {
      // §24: 자동 실행 금지. 사용자가 직접 누른다.
      return { ok: false, errorCode: ERR.ACTION_NOT_ALLOWED, role, riskLevel };
    }
    // 로그인 폼의 submit 은 사용자 직접(§19·§31·§42).
    const form = el.closest('form');
    if (form && form.querySelector(PASSWORD_IN_FORM_SELECTOR)) {
      return { ok: false, errorCode: ERR.USER_ACTION_REQUIRED, role, userActionRequired: true };
    }
    let navigationLikely = false;
    if (role === 'link') {
      const url = linkTarget(el);
      if (!url || !['https:', 'http:'].includes(url.protocol)) {
        // javascript: · mailto: · 알 수 없는 scheme — 링크로 취급하지 않는다.
        if (url && url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, errorCode: ERR.ACTION_NOT_ALLOWED, role };
      } else if (!ALLOWED_ORIGINS.includes(url.origin)) {
        return { ok: false, errorCode: ERR.CROSS_ORIGIN_BLOCKED, role, riskLevel };
      } else {
        navigationLikely = url.pathname !== location.pathname || url.search !== location.search;
      }
    }
    el.click();
    if (navigationLikely) {
      // 문서가 통째로 바뀌면 이 스크립트는 사라진다 — 응답을 먼저 보낸다. SPA 면 곧 pathname 이 바뀐다.
      return { ok: true, elementRef: payload.elementRef, role, riskLevel, navigated: true, changed: true };
    }
    const after = await observeChange(300);
    return { ok: true, elementRef: payload.elementRef, role, riskLevel, ...after };
  }

  function cellsOf(row) {
    return [...row.querySelectorAll('th, td, [role="cell"], [role="columnheader"], [role="gridcell"]')].map((c) =>
      clip(c.innerText || c.textContent, DOM_CELL_MAX_LENGTH),
    );
  }

  function actReadTable(payload) {
    let table = null;
    if (payload && payload.elementRef) {
      const r = resolveRef(payload.snapshotId, payload.elementRef);
      if (r.error) return { ok: false, errorCode: r.error };
      table = r.el;
      if (roleOf(table) !== 'table') return { ok: false, errorCode: ERR.ACTION_NOT_ALLOWED, role: roleOf(table) };
    } else {
      for (const t of document.querySelectorAll(TABLE_SELECTOR)) {
        if (isVisible(t)) {
          table = t;
          break;
        }
      }
      if (!table) return { ok: false, errorCode: ERR.ELEMENT_NOT_FOUND };
    }
    const rowsAll = [...table.querySelectorAll('tr, [role="row"]')].filter((r) => r.closest('table, [role="table"], [role="grid"]') === table);
    let columns = [];
    let bodyRows = rowsAll;
    if (rowsAll.length > 0 && rowsAll[0].querySelector('th, [role="columnheader"]')) {
      columns = cellsOf(rowsAll[0]).slice(0, DOM_TABLE_MAX_COLUMNS);
      bodyRows = rowsAll.slice(1);
    }
    const rows = bodyRows.slice(0, DOM_TABLE_MAX_ROWS).map((r) => cellsOf(r).slice(0, DOM_TABLE_MAX_COLUMNS));
    return { ok: true, role: 'table', columns, rows, rowCount: bodyRows.length };
  }

  const ACTIONS = {
    'dom.get_context': actGetContext,
    'dom.inspect': actInspect,
    'dom.find': actFind,
    'dom.read_text': actReadText,
    'dom.set_input': actSetInput,
    'dom.select_option': actSelectOption,
    'dom.click': actClick,
    'dom.read_table': actReadTable,
  };

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // 이 확장의 service worker 가 보낸 것만. 페이지 · 다른 확장은 여기 닿지 못한다.
    if (!sender || sender.id !== chrome.runtime.id || sender.tab) return false;
    if (!msg || typeof msg.action !== 'string' || !ACTIONS[msg.action]) return false;
    const payload = msg.payload && typeof msg.payload === 'object' ? msg.payload : {};
    if (payload.siteId !== SITE_ID) {
      sendResponse({ ok: false, errorCode: ERR.SITE_NOT_ALLOWED });
      return false;
    }
    Promise.resolve()
      .then(() => ACTIONS[msg.action](payload))
      .then((result) => sendResponse(result))
      .catch(() => sendResponse({ ok: false, errorCode: ERR.CONTENT_UNAVAILABLE }));
    return true; // async sendResponse
  });
})();
