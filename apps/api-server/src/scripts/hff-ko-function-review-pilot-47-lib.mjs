/** 파일럿 47 공용 헬퍼 (read-only 기본). */
import pg from 'pg';
import crypto from 'node:crypto';

export const D = 'apps/api-server/src/scripts/data';
export const MANIFEST = `${D}/hff-ko-function-review-pilot-fragmented-malformed-47-manifest-v1.json`;

export const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
export const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
export const unesc = (s) => (s ?? '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** read-only 세션 (감사·dry-run·독립검증 전용) */
export async function connectReadOnly() {
  const port = parseInt(process.env.PROXY_PORT ?? '5481', 10);
  const c = new pg.Client({ host: '127.0.0.1', port, user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
  await c.connect();
  await c.query('SET default_transaction_read_only = on');
  return c;
}

/** write 세션 — SAFE 대상 제한 UPDATE 전용. 명시적으로만 사용. */
export async function connectWritable() {
  const port = parseInt(process.env.PROXY_PORT ?? '5481', 10);
  const c = new pg.Client({ host: '127.0.0.1', port, user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
  await c.connect();
  return c;
}

/** 저장 content 에서 기능성 섹션 HTML 을 잘라낸다 (renderer family 무관). */
export function sliceFunctionBlock(ko) {
  const startMarks = ['<h2>주요 기능성</h2>', '<h2>주요 기능성 (공식 인정)</h2>', '<h2>기능성</h2>'];
  let fi = -1, usedStart = null;
  for (const m of startMarks) { const i = ko.indexOf(m); if (i >= 0 && (fi < 0 || i < fi)) { fi = i; usedStart = m; } }
  if (fi < 0) {
    // 헤딩 문구가 다른 경우: 첫 <h2> 중 '기능' 포함
    const m = ko.match(/<h2>[^<]*기능[^<]*<\/h2>/);
    if (m) { fi = ko.indexOf(m[0]); usedStart = m[0]; }
  }
  if (fi < 0) return { found: false, html: '', start: -1, end: -1, startMark: null, endMark: null };
  // 다음 h2 까지
  const after = ko.slice(fi + (usedStart?.length ?? 0));
  const nx = after.match(/<h2>/);
  const end = nx ? fi + (usedStart?.length ?? 0) + after.indexOf(nx[0]) : ko.length;
  return { found: true, html: ko.slice(fi, end), start: fi, end, startMark: usedStart, endMark: nx ? '<h2>' : null };
}

/**
 * 공백 전부 제거 비교키.
 * SOURCE_LINE_BREAK_FRAGMENTED 원문("…감소에 도\n움을 줌")을 렌더러가 올바르게 결합("도움을 줌")한 경우,
 * 공백 유지 비교로는 부분문자열 판정이 실패한다. grounding 판정은 이 dense 키로 한다.
 */
export const dense = (s) => (s ?? '').replace(/&nbsp;/g, '').replace(/[\s 　]/g, '');

/**
 * 기능성 블록에서 렌더된 항목 텍스트 추출.
 * COMPOSITE 렌더러는 <li> 안에 <b>라벨</b><ul class="sd-why"><li>… 를 중첩하므로
 * 단순 <li>…</li> 정규식은 라벨·마크업을 항목 텍스트로 흡수한다(허위 not-grounded 발생).
 * → 항목별로 내부 태그를 제거하고, <b> 라벨은 별도 수집한다.
 */
export function extractRenderedFunctions(ko) {
  const b = sliceFunctionBlock(ko);
  if (!b.found) return { items: [], tags: [], labels: [], block: b };
  const html = b.html;
  const strip = (s) => nrm(unesc(s.replace(/<[^>]+>/g, ' ')));

  // 최말단 <li> 만 취한다: 여는 <li> 이후 다음 <li> 또는 </li> 까지
  const items = [];
  const re = /<li[^>]*>([\s\S]*?)(?=<li[^>]*>|<\/li>)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const t = strip(m[1]);
    if (t) items.push(t);
  }
  const tags = [...html.matchAll(/<span class="sd-tag">([\s\S]*?)<\/span>/g)].map((x) => nrm(unesc(x[1])));
  const labels = [...html.matchAll(/<b>([\s\S]*?)<\/b>/g)].map((x) => nrm(unesc(x[1])));
  return { items, tags, labels, block: b };
}

/** 대괄호 균형·손상 진단 */
export function bracketDiagnosis(raw) {
  const t = (raw ?? '').replace(/\r/g, '');
  const open = (t.match(/\[/g) ?? []).length;
  const close = (t.match(/\]/g) ?? []).length;
  // 순차 스캔으로 미매칭 위치 찾기
  let depth = 0, maxDepth = 0;
  const unmatchedOpen = [], unmatchedClose = [];
  const stack = [];
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '[') { stack.push(i); depth++; maxDepth = Math.max(maxDepth, depth); }
    else if (t[i] === ']') { if (stack.length) { stack.pop(); depth--; } else unmatchedClose.push(i); }
  }
  for (const i of stack) unmatchedOpen.push(i);
  // 대괄호가 줄바꿈으로 쪼개졌는지
  const bracketSpansNewline = /\[[^\]\n]*\n[^\]]*\]/.test(t);
  // 대괄호 안에 대괄호
  const nested = maxDepth >= 2;
  const ctx = (i) => t.slice(Math.max(0, i - 40), Math.min(t.length, i + 40)).replace(/\n/g, '\\n');
  return {
    openCount: open, closeCount: close, balanced: open === close && unmatchedOpen.length === 0 && unmatchedClose.length === 0,
    unmatchedOpenPositions: unmatchedOpen, unmatchedClosePositions: unmatchedClose,
    unmatchedOpenContexts: unmatchedOpen.slice(0, 4).map(ctx),
    unmatchedCloseContexts: unmatchedClose.slice(0, 4).map(ctx),
    nested, maxDepth, bracketSpansNewline,
    labels: [...t.matchAll(/\[([^\]\n]{1,60})\]/g)].map((m) => m[1].trim()),
  };
}

/** 줄바꿈 파편 진단 — 줄이 기능성 종결어 없이 끊기는지 */
const FN_TAIL = /(필요|있음|도움을 줌|도움|개선|유지|감소|억제|보호|완화|증진|원활)\s*[.]?$/;
export function lineBreakDiagnosis(raw) {
  const lines = (raw ?? '').replace(/\r/g, '').split('\n').map((x) => x.trim());
  const nonEmpty = lines.filter(Boolean);
  const frags = [];
  for (let i = 0; i < nonEmpty.length; i++) {
    const cur = nonEmpty[i];
    const isLast = i === nonEmpty.length - 1;
    const endsClean = FN_TAIL.test(cur) || /[:：]$/.test(cur) || /^\[.*\]$/.test(cur);
    if (!endsClean && !isLast) {
      frags.push({ lineIndex: i, head: cur.slice(-60), nextHead: nonEmpty[i + 1].slice(0, 60), joined: (cur + nonEmpty[i + 1]).slice(-100) });
    }
  }
  return { lineCount: nonEmpty.length, fragmentCandidates: frags.length, fragments: frags.slice(0, 6) };
}
