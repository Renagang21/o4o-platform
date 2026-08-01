/**
 * WO-O4O-HFF-EN-BULK-PRODUCTION-BATCH-01-5000-V1 / 번역 엔진 (read-only, DB 미수정).
 *
 * KO canonical HTML 을 템플릿으로 삼아 **텍스트 슬롯만** 치환한다.
 * 구조(태그·class·순서)는 그대로 두므로 renderer family 가 자동으로 계승된다.
 * 모든 치환은 승인 사전 / 고정 용어집 / 수치 템플릿 중 하나를 근거로 하며,
 * 근거가 없는 슬롯이 하나라도 있으면 그 문서는 생성하지 않고 HOLD 한다.
 */
import fs from 'node:fs';
import { applyFrames } from './hff-en-hold4209-frames.mjs';
import { parseUsage } from './hff-en-usage-parser.mjs';

const D = 'apps/api-server/src/scripts/data';
const ASSETS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-translation-assets-v1.json`, 'utf8'));
const GLOS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-glossary-v1.json`, 'utf8'));
const MANUAL = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-manual-glossary-v1.json`, 'utf8'));
const MANUAL2 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-manual-glossary-2-v1.json`, 'utf8'));
const TOP = JSON.parse(fs.readFileSync(`${D}/hff-en-top1000-translations-v1.json`, 'utf8'));
const N326 = JSON.parse(fs.readFileSync(`${D}/hff-en-nonusage326-translations-v1.json`, 'utf8'));
const R2237 = JSON.parse(fs.readFileSync(`${D}/hff-en-r2237-translations-v1.json`, 'utf8'));
const NEXT = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-next-translations-v1.json`, 'utf8'));
const R3 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r3-translations-v1.json`, 'utf8'));
const R4 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r4-translations-v1.json`, 'utf8'));
const R5 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r5-translations-v1.json`, 'utf8'));

export const norm = (s) => (s ?? '').replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ').trim();

// 열거 구분자·마커·종결부호는 의미가 아니라 표기다. 사전 조회 키에서만 통일한다(원문은 보존).
const MARK = /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮➀➁➂➃➄]|\(\s*\d+\s*\)|^\s*\d+\s*[).]|\s\d\s*[).]/g;
// 지시형 어미는 표기 차이일 뿐 의미가 같다. 사전 조회 키에서만 하나로 모은다(원문은 보존).
//   상담할 것 / 상담하십시오 / 상담하시기 바랍니다 / 상담한다  → 상담할것
// `~할 수 있음`(가능성)과 `~할 것`(지시)은 서로 다른 의미이므로 섞지 않는다.
const ENDING = [
  [/(?:하시기\s*바랍니다|하시길\s*바랍니다|하기\s*바랍니다|해\s*주시기\s*바랍니다|하여\s*주시기\s*바랍니다)$/, '할것'],
  [/(?:하지\s*마십시오|하지\s*마세요|하지\s*말\s*것|하지\s*않는다)$/, '하지말것'],
  [/(?:하십시오|하세요|합니다|한다|하여야\s*함|해야\s*함|할\s*것|하시오)$/, '할것'],
  [/(?:입니다|이다)$/, '임'],
  [/(?:있습니다)$/, '있음'],
];
export const key = (s) => {
  let v = norm(s)
    .replace(/[·․⋅ㆍ•∙‧・･]/g, '·')
    .replace(MARK, ' ')
    .replace(/[,，、]/g, '·')
    .replace(/[.。]\s*$/, '')
    .replace(/^[\s:：·]+/, '')
    .replace(/[\s·]+$/, '');
  for (const [re, to] of ENDING) { const n = v.replace(re, to); if (n !== v) { v = n; break; } }
  return v.replace(/\s/g, '').replace(/·+/g, '·');
};

const DICT = {
  clause: {}, label: {}, heading: {}, foot: {}, badge: {}, intro: {}, meta: {},
};
// 1) 승인된 EN canonical 에서 역산한 사전
for (const kind of Object.keys(DICT)) for (const [k, v] of Object.entries(ASSETS.dict[kind] ?? {})) DICT[kind][key(k)] = v;
// 2) DRIVER lane 고정 용어집
for (const [kind, m] of Object.entries(GLOS.fixed ?? {})) for (const [k, v] of Object.entries(m)) DICT[kind][key(k)] = v;
// 3) 이번 batch 에서 확정한 수동 용어집
for (const [kind, m] of Object.entries(MANUAL.dict ?? {})) for (const [k, v] of Object.entries(m)) DICT[kind][key(k)] = v;
for (const [kind, m] of Object.entries(MANUAL2.dict ?? {})) for (const [k, v] of Object.entries(m)) DICT[kind][key(k)] = v;
// 4) 이번 라운드에서 확정한 신규 전문 번역 (top1000)
for (const kind of ['clause', 'meta', 'label']) for (const [k, v] of Object.entries(TOP[kind] ?? {})) DICT[kind][key(k)] = v;
// usage 문장은 clause / meta 양쪽 슬롯에서 모두 쓰인다
for (const [k, v] of Object.entries(TOP.usage ?? {})) { DICT.clause[key(k)] = v; DICT.meta[key(k)] = v; }
// 5) 비-USAGE 326종 직접 번역
for (const kind of ['clause', 'meta', 'label']) for (const [k, v] of Object.entries(N326[kind] ?? {})) DICT[kind][key(k)] = v;
// standard 문구는 clause 슬롯에서 쓰인다
for (const [k, v] of Object.entries(N326.standard ?? {})) { DICT.clause[key(k)] = v; DICT.meta[key(k)] = v; }
// 주의사항·기능성 문구는 clause / meta 어느 슬롯에서도 등장한다
for (const [k, v] of Object.entries(N326.clause ?? {})) DICT.meta[key(k)] = v;
for (const [k, v] of Object.entries(N326.label ?? {})) DICT.clause[key(k)] = v;
// 6) 잔여 2,237건 직접 번역
for (const kind of ['clause', 'meta', 'label']) for (const [k, v] of Object.entries(R2237[kind] ?? {})) DICT[kind][key(k)] = v;
for (const [k, v] of Object.entries(R2237.clause ?? {})) DICT.meta[key(k)] = v;
for (const [k, v] of Object.entries(R2237.label ?? {})) DICT.clause[key(k)] = v;
// 7) round 2 직접 번역
for (const kind of ['clause', 'meta', 'label']) for (const [k, v] of Object.entries(NEXT[kind] ?? {})) DICT[kind][key(k)] = v;
for (const [k, v] of Object.entries(NEXT.clause ?? {})) DICT.meta[key(k)] = v;
for (const [k, v] of Object.entries(NEXT.label ?? {})) DICT.clause[key(k)] = v;
for (const [k, v] of Object.entries(NEXT.meta ?? {})) DICT.clause[key(k)] = v;
// 8) round 3 직접 번역
for (const kind of ['clause', 'meta', 'label']) for (const [k, v] of Object.entries(R3[kind] ?? {})) DICT[kind][key(k)] = v;
for (const [k, v] of Object.entries(R3.clause ?? {})) DICT.meta[key(k)] = v;
for (const [k, v] of Object.entries(R3.label ?? {})) DICT.clause[key(k)] = v;
for (const [k, v] of Object.entries(R3.meta ?? {})) DICT.clause[key(k)] = v;
// 9) round 4 직접 번역
for (const kind of ['clause', 'meta', 'label']) for (const [k, v] of Object.entries(R4[kind] ?? {})) DICT[kind][key(k)] = v;
for (const [k, v] of Object.entries(R4.clause ?? {})) DICT.meta[key(k)] = v;
for (const [k, v] of Object.entries(R4.label ?? {})) DICT.clause[key(k)] = v;
for (const [k, v] of Object.entries(R4.meta ?? {})) DICT.clause[key(k)] = v;
// 10) round 5 직접 번역
for (const kind of ['clause', 'meta', 'label']) for (const [k, v] of Object.entries(R5[kind] ?? {})) DICT[kind][key(k)] = v;
for (const [k, v] of Object.entries(R5.clause ?? {})) DICT.meta[key(k)] = v;
for (const [k, v] of Object.entries(R5.label ?? {})) DICT.clause[key(k)] = v;
for (const [k, v] of Object.entries(R5.meta ?? {})) DICT.clause[key(k)] = v;

// ── 수치 템플릿 ────────────────────────────────────────────────────────────
const CNT = { 정: 'tablet', 캡슐: 'capsule', 포: 'stick pack', 스푼: 'spoonful', 알: 'piece', 병: 'bottle', 개: 'piece', 매: 'sheet', 방울: 'drop' };
const scale = (s) => s.replace(/억/g, ' hundred million').replace(/만/g, ' ten thousand').replace(/천/g, ' thousand').replace(/\s+/g, ' ').trim();
const times = (n) => (n === '1' ? 'once' : n === '2' ? 'twice' : `${n} times`);

const TEMPLATES = [
  { id: 'directions', kinds: ['meta', 'clause'],
    re: /^1일\s*(\d+)\s*회,?\s*1회\s*([\d.~\-]+)\s*(정|캡슐|포|스푼|알|병|개|매|방울)(?:\s*\([^)]*\))?\s*(?:씩|을|를)?\s*(충분한\s*)?(물과 함께|직접 또는 물과 함께|그대로 혹은 물과 함께|직접 섭취하거나 물과 함께|씹어서|직접|그대로|입안에서 녹여)?\s*(?:섭취(?:하십시오|합니다|한다|하세요|할 것)?)\.?$/,
    en: (m) => {
      const how = { '물과 함께': ' with water', '직접 또는 물과 함께': ' directly or with water',
        '그대로 혹은 물과 함께': ' as is or with water', '직접 섭취하거나 물과 함께': ' directly or with water',
        '씹어서': ' by chewing', '직접': ' directly', '그대로': ' as is', '입안에서 녹여': ' by letting it dissolve in the mouth' }[m[5]] ?? '';
      const plenty = m[4] && /물/.test(m[5] ?? '') ? ' with plenty of water' : how;
      // 괄호 용량은 실제 섭취량 정보다. 누락하면 안 된다.
      const cap = (norm(m[0]).match(/\(\s*(?:1[가-힣]+\s*당\s*)?([\d.,~\-]+\s*(?:g|kg|mg|㎎|ml|mL|㎖|L|cc))\s*\)/) ?? [])[1];
      const dose = `${m[2]} ${CNT[m[3]]}${m[2] === '1' ? '' : 's'}${cap ? ` (${cap.replace(/\s/g, '')})` : ''}`;
      return `Take ${dose} ${times(m[1])} a day${m[4] && /물/.test(m[5] ?? '') ? ' with plenty of water' : how}.`;
    } },
  { id: 'cfu', kinds: ['badge', 'label', 'clause', 'meta'],
    re: /^([\d.,]+\s*(?:mg|g|㎎|mL|ml|정|캡슐|포))당\s*([\d.,]+\s*(?:억|만|천)?)\s*CFU\s*이상$/,
    en: (m) => `At least ${scale(m[2])} CFU per ${m[1].replace(/\s+/g, '')}` },
  { id: 'nutrientAmount', kinds: ['badge', 'label'],
    re: /^(비타민\s*[A-Z]\d*|아연|셀렌|셀레늄|망간|엽산|철|칼슘|마그네슘|비오틴|나이아신|판토텐산|구리|요오드|크롬|몰리브덴)\s*([\d.,]+\s*(?:mg|g|㎎|ug|㎍|μg|mcg|IU))$/,
    en: (m) => `${MANUAL.ingredient[m[1]] ?? m[1].replace(/비타민\s*/, 'Vitamin ')} ${m[2].replace(/\s+/g, '')}` },
  { id: 'perDay', kinds: ['badge', 'label'], re: /^1일\s*(\d+)\s*회$/, en: (m) => `${times(m[1]).replace(/^./, (x) => x.toUpperCase())} a day` },
  { id: 'perServe', kinds: ['badge', 'label'], re: /^1회\s*([\d.~\-]+)\s*(정|캡슐|포|스푼|알|개|매|방울)$/,
    en: (m) => `${m[1]} ${CNT[m[2]]}${m[1] === '1' ? '' : 's'} per serving` },
];

// ── 절 조합 (다기능 절) ────────────────────────────────────────────────────
const FRAMES = [
  { re: /^(.+?)에도움을줄수있음$/, en: (x) => `May help with ${x}` },
  { re: /^(.+?)에도움을줌$/, en: (x) => `May help with ${x}` },
  { re: /^(.+?)에필요$/, en: (x) => `Needed for ${x}` },
];
const PHRASE = { ...(GLOS.phrase ?? {}) };
for (const [k, v] of Object.entries(MANUAL.phrase ?? {})) PHRASE[key(k)] = v;
for (const [k, v] of Object.entries(MANUAL2.phrase ?? {})) PHRASE[key(k)] = v;

function composeClause(k) {
  for (const f of FRAMES) {
    const m = k.match(f.re);
    if (!m) continue;
    const parts = m[1].split('·').filter(Boolean);
    if (!parts.length) continue;
    // 각 조각이 그 자체로 완성 절이면(`…에도움을줄수있음`) 조각의 명사구를 다시 꺼낸다
    const en = [];
    for (let p of parts) {
      for (const g of FRAMES) { const mm = p.match(g.re); if (mm) { p = mm[1]; break; } }
      const v = PHRASE[p];
      if (!v) return null;
      en.push(v);
    }
    return f.en(en.length === 1 ? en[0]
      : en.length === 2 ? `${en[0]} and ${en[1]}`
      : `${en.slice(0, -1).join(', ')}, and ${en[en.length - 1]}`);
  }
  return null;
}

export function lookup(kind, text) {
  const k = key(text);
  if (!k) return { en: '', how: 'empty' };
  const d = DICT[kind]?.[k];
  if (d) return { en: d, how: 'dict' };
  for (const t of TEMPLATES) {
    if (!t.kinds.includes(kind)) continue;
    const m = norm(text).match(t.re);
    if (m) return { en: t.en(m), how: `tpl:${t.id}` };
  }
  if (kind === 'clause' || kind === 'meta' || kind === 'badge') {
    const fr = applyFrames(k);
    if (fr) return { en: fr, how: 'frame' };
  }
  if (kind === 'clause' || kind === 'meta') {
    const u = parseUsage(norm(text));
    if (u) return { en: u, how: 'usageParser' };
  }
  if (kind === 'clause') {
    const c = composeClause(k);
    if (c) return { en: c, how: 'compose' };
    // `비타민B1: 탄수화물과 에너지 대사에 필요` — 라벨과 절이 한 li 에 붙은 형태
    const lc = k.match(/^([^:：]{2,30})[:：](.+)$/);
    if (lc) {
      const L = DICT.label[key(lc[1])] ?? DICT.label[lc[1]];
      const C = DICT.clause[lc[2]] ?? composeClause(lc[2]);
      if (L && C) return { en: `${L}: ${C}`, how: 'labelClause' };
    }
    // 다른 슬롯 사전에 같은 문자열이 있으면 재사용 (라벨/절 공용 문구)
    for (const alt of ['label', 'meta', 'badge']) if (DICT[alt][k]) return { en: DICT[alt][k], how: `dict:${alt}` };
  }
  if (kind === 'label' || kind === 'badge' || kind === 'meta') {
    for (const alt of ['label', 'clause', 'badge', 'meta']) if (DICT[alt][k]) return { en: DICT[alt][k], how: `dict:${alt}` };
  }
  return null;
}

export const SLOT_RE = [
  { kind: 'heading', re: /(<h2>)([\s\S]*?)(<\/h2>)/g },
  { kind: 'intro', re: /(<p class="sd-intro">)([\s\S]*?)(<\/p>)/g },
  { kind: 'meta', re: /(<p class="sd-meta">)([\s\S]*?)(<\/p>)/g },
  { kind: 'badge', re: /(<span class="sd-badge[^"]*">)([\s\S]*?)(<\/span>)/g },
  { kind: 'label', re: /(<span class="sd-tag">)([\s\S]*?)(<\/span>)/g },
  // WAE family 의 원료 라벨: <li><b>라벨</b><ul class="sd-why">…
  { kind: 'label', re: /(<li>\s*<b>)([\s\S]*?)(<\/b>)/g },
  { kind: 'foot', re: /(<div class="sd-foot">)([\s\S]*?)(<\/div>)/g },
  { kind: 'clause', re: /(<li>)((?:(?!<li>|<\/li>)[\s\S])*?)(<\/li>)/g },
];

export const dictStats = () => Object.fromEntries(Object.entries(DICT).map(([k, v]) => [k, Object.keys(v).length]));
