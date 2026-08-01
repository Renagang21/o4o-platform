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
const R6 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r6-translations-v1.json`, 'utf8'));
const R7 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r7-translations-v1.json`, 'utf8'));
const R8 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r8-translations-v1.json`, 'utf8'));
const R9 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r9-translations-v1.json`, 'utf8'));
const R10 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r10-translations-v1.json`, 'utf8'));
const R11 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r11-translations-v1.json`, 'utf8'));
const R12 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r12-translations-v1.json`, 'utf8'));
const R13 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r13-translations-v1.json`, 'utf8'));
const R14 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r14-translations-v1.json`, 'utf8'));
const R15 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r15-translations-v1.json`, 'utf8'));
const R16 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r16-translations-v1.json`, 'utf8'));
const R17 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r17-translations-v1.json`, 'utf8'));
const R18 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r18-translations-v1.json`, 'utf8'));
const R19 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r19-translations-v1.json`, 'utf8'));
const R20 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r20-translations-v1.json`, 'utf8'));
const R21 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r21-translations-v1.json`, 'utf8'));
const R22 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r22-translations-v1.json`, 'utf8'));
const R23 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r23-translations-v1.json`, 'utf8'));
const R24 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-r24-translations-v1.json`, 'utf8'));
const B1 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-b1-translations-v1.json`, 'utf8'));
const B2 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-b2-translations-v1.json`, 'utf8'));
const B3 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-b3-translations-v1.json`, 'utf8'));
const B4 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-b4-translations-v1.json`, 'utf8'));
const B5 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-b5-translations-v1.json`, 'utf8'));
const B6 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-b6-translations-v1.json`, 'utf8'));
// Batch 02 잔여 915 직접 번역 라운드 (파일이 없으면 빈 객체로 시작한다)
const R915 = [1,2,3,4,5,6,7,8,9,10,11,12].map((n) => {
  const f = `${D}/hff-en-b02-r915-t${n}-translations-v1.json`;
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
});

export const norm = (s) => (s ?? '').replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  // 사설 영역(PUA) 글리프·제로폭 문자는 레거시 심볼 폰트가 남긴 표기 잔재이며 의미가 없다.
  // 조회 키에서만 제거한다(원문 HTML 은 그대로 보존된다).
  .replace(new RegExp('[\\uE000-\\uF8FF\\u200B-\\u200F\\uFEFF]', 'g'), '')
  .replace(/\s+/g, ' ').trim();

// 열거 구분자·마커·종결부호는 의미가 아니라 표기다. 사전 조회 키에서만 통일한다(원문은 보존).
const MARK = /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮➀➁➂➃➄]|\(\s*\d+\s*\)|^\s*\d+\s*[).]|\s\d\s*[).]/g;
// 지시형 어미는 표기 차이일 뿐 의미가 같다. 사전 조회 키에서만 하나로 모은다(원문은 보존).
//   상담할 것 / 상담하십시오 / 상담하시기 바랍니다 / 상담한다  → 상담할것
// `~할 수 있음`(가능성)과 `~할 것`(지시)은 서로 다른 의미이므로 섞지 않는다.
const ENDING = [
  [/(?:하시기\s*바랍니다|하시길\s*바랍니다|하기\s*바랍니다|해\s*주시기\s*바랍니다|하여\s*주시기\s*바랍니다)$/, '할것'],
  [/(?:하지\s*마십시오|하지\s*마세요|하지\s*말\s*것|하지\s*않는다)$/, '하지말것'],
  [/(?:하여\s*주십시오|하여\s*주세요|해\s*주십시오|해\s*주세요|하여\s*주시길\s*바랍니다)$/, '할것'],
  [/(?:하십시오|하세요|합니다|한다|하여야\s*함|해야\s*함|할\s*것|하시오)$/, '할것'],
  [/(?:입니다|이다)$/, '임'],
  [/(?:있습니다)$/, '있음'],
];
export const key = (s) => {
  let v = norm(s)
    .replace(/[··․⋅ㆍ•∙‧・･]/g, '·')
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
// 11) round 6 직접 번역
for (const kind of ['clause', 'meta', 'label']) for (const [k, v] of Object.entries(R6[kind] ?? {})) DICT[kind][key(k)] = v;
for (const [k, v] of Object.entries(R6.clause ?? {})) DICT.meta[key(k)] = v;
for (const [k, v] of Object.entries(R6.label ?? {})) DICT.clause[key(k)] = v;
for (const [k, v] of Object.entries(R6.meta ?? {})) DICT.clause[key(k)] = v;
// 12) round 7 직접 번역
for (const kind of ['clause', 'meta', 'label']) for (const [k, v] of Object.entries(R7[kind] ?? {})) DICT[kind][key(k)] = v;
for (const [k, v] of Object.entries(R7.clause ?? {})) DICT.meta[key(k)] = v;
for (const [k, v] of Object.entries(R7.label ?? {})) DICT.clause[key(k)] = v;
for (const [k, v] of Object.entries(R7.meta ?? {})) DICT.clause[key(k)] = v;
// 13) round 8 직접 번역
for (const kind of ['clause', 'meta', 'label']) for (const [k, v] of Object.entries(R8[kind] ?? {})) DICT[kind][key(k)] = v;
for (const [k, v] of Object.entries(R8.clause ?? {})) DICT.meta[key(k)] = v;
for (const [k, v] of Object.entries(R8.label ?? {})) DICT.clause[key(k)] = v;
for (const [k, v] of Object.entries(R8.meta ?? {})) DICT.clause[key(k)] = v;
// 14) round 9 직접 번역 — 동일 문구가 heading/intro/foot/badge 슬롯에도 나타나므로 전 슬롯에 등록한다
for (const src of [R9.clause ?? {}, R9.meta ?? {}, R9.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 15) round 10 직접 번역
for (const src of [R10.clause ?? {}, R10.meta ?? {}, R10.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 16) round 11 직접 번역
for (const src of [R11.clause ?? {}, R11.meta ?? {}, R11.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 17) round 12 직접 번역
for (const src of [R12.clause ?? {}, R12.meta ?? {}, R12.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 18) round 13 직접 번역
for (const src of [R13.clause ?? {}, R13.meta ?? {}, R13.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 19) round 14 직접 번역
for (const src of [R14.clause ?? {}, R14.meta ?? {}, R14.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 20) round 15 직접 번역
for (const src of [R15.clause ?? {}, R15.meta ?? {}, R15.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 21) round 16 직접 번역
for (const src of [R16.clause ?? {}, R16.meta ?? {}, R16.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 22) round 17 직접 번역
for (const src of [R17.clause ?? {}, R17.meta ?? {}, R17.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 23) round 18 직접 번역
for (const src of [R18.clause ?? {}, R18.meta ?? {}, R18.label ?? {}, R18.intro ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 24) round 19 직접 번역
for (const src of [R19.clause ?? {}, R19.meta ?? {}, R19.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 25) round 20 직접 번역
for (const src of [R20.clause ?? {}, R20.meta ?? {}, R20.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 26) round 21 직접 번역
for (const src of [R21.clause ?? {}, R21.meta ?? {}, R21.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 27) round 22 직접 번역 (라벨-절 분리 잔여 · NUMBER_DRIFT 명시 지정)
for (const src of [R22.clause ?? {}, R22.meta ?? {}, R22.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 28) round 23 직접 번역
for (const src of [R23.clause ?? {}, R23.meta ?? {}, R23.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 29) round 24 직접 번역
for (const src of [R24.clause ?? {}, R24.meta ?? {}, R24.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 30) Batch 02 직접 번역 b1
for (const src of [B1.clause ?? {}, B1.meta ?? {}, B1.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 31) Batch 02 직접 번역 b2
for (const src of [B2.clause ?? {}, B2.meta ?? {}, B2.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 32) Batch 02 직접 번역 b3
for (const src of [B3.clause ?? {}, B3.meta ?? {}, B3.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 33) Batch 02 직접 번역 b4 (복합 포장 섭취방법 · NUMBER_DRIFT 명시 지정)
for (const src of [B4.clause ?? {}, B4.meta ?? {}, B4.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 34) Batch 02 직접 번역 b5
for (const src of [B5.clause ?? {}, B5.meta ?? {}, B5.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 35) Batch 02 직접 번역 b6
for (const src of [B6.clause ?? {}, B6.meta ?? {}, B6.label ?? {}])
  for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;
// 36) Batch 02 잔여 915 직접 번역 (t1~)
for (const T of R915)
  for (const src of [T.clause ?? {}, T.meta ?? {}, T.label ?? {}, T.intro ?? {}])
    for (const [k, v] of Object.entries(src)) for (const kind of Object.keys(DICT)) DICT[kind][key(k)] = v;

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

// 라벨 키를 길이 내림차순으로 캐시한다 (접미 라벨 매칭용)
let LABEL_KEYS = null;
const labelKeys = () => (LABEL_KEYS ??= Object.keys(DICT.label).filter((k) => k.length >= 2 && k.length <= 24).sort((a, b) => b.length - a.length));
const clauseEn = (k) => DICT.clause[k] ?? composeClause(k) ?? null;
const labelEn = (k) => DICT.label[k] ?? null;

// 절 뒤에 다음 항목의 라벨이 붙어 잘린 형태를 절+라벨로 분해한다.
// 양쪽이 모두 기존 자산으로 해석될 때만 성립하므로 오조합 위험이 없다.
function composeTail(k) {
  const body = k.replace(/[:：\-–]+$/, '');
  for (let i = 1; i < body.length - 1; i++) {
    const ch = body[i];
    if (ch !== '*' && ch !== '-' && ch !== '–') continue;
    const C = clauseEn(body.slice(0, i).replace(/[·\-–]+$/, ''));
    const L = labelEn(body.slice(i + 1).replace(/^[·\-–]+/, ''));
    if (C && L) return `${C} * ${L}`;
  }
  for (const lk of labelKeys()) {
    if (!body.endsWith(lk) || body.length === lk.length) continue;
    const C = clauseEn(body.slice(0, body.length - lk.length).replace(/[·\-–*]+$/, ''));
    if (C) return `${C} ${DICT.label[lk]}${/[:：]$/.test(k) ? ':' : ''}`;
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
    // `<절> * <라벨>` / `<절> - <라벨> :` / `<절><라벨>:` — 다음 원료 라벨이 절 뒤에 붙어 잘린 형태
    const ct = composeTail(k);
    if (ct) return { en: ct, how: 'composeTail' };
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
