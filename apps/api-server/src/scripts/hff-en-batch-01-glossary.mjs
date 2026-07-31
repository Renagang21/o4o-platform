/**
 * WO-O4O-HFF-EN-BULK-PRODUCTION-BATCH-01-5000-V1 / 고정 영어 용어집 구축.
 *
 * 1) 승인된 clause 사전 18,693건을 문형별로 분해해 **명사구 사전**을 역산한다.
 *    `배변활동 원활에 도움을 줄 수 있음` ↔ `May help with smooth bowel movements`
 *      → 명사구 `배변활동 원활` ↔ `smooth bowel movements`
 * 2) 역산된 명사구로 미커버 절을 **조합 생성**한다. 조합 근거가 없으면 생성하지 않는다.
 * 3) DRIVER lane 의 heading/foot/intro/meta/badge 는 고정 문구로 확정한다.
 */
import fs from 'node:fs';

const D = 'apps/api-server/src/scripts/data';
const ASSETS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-translation-assets-v1.json`, 'utf8'));
const norm = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/[･·∙‧・•]/g, '·').replace(/\s+/g, ' ').trim();
const key = (s) => norm(s).replace(/\s/g, '');

// ── 문형 (KO 접미 → EN 프레임) ─────────────────────────────────────────────
const FRAMES = [
  { ko: /^(.+?)에 도움을 줄 수 있음$/, en: (x) => `May help with ${x}` },
  { ko: /^(.+?)에 도움을 줄 수 있습니다$/, en: (x) => `May help with ${x}` },
  { ko: /^(.+?)에 도움을 줌$/, en: (x) => `May help with ${x}` },
  { ko: /^(.+?)에 필요$/, en: (x) => `Needed for ${x}` },
  { ko: /^(.+?)에 관여$/, en: (x) => `Involved in ${x}` },
  { ko: /^(.+?)을 위해 필요$/, en: (x) => `Needed for ${x}` },
  { ko: /^(.+?)하는데 필요$/, en: (x) => `Needed to ${x}` },
  { ko: /^(.+?)할 것$/, en: (x) => `${x}` },
  { ko: /^(.+?)하십시오\.?$/, en: (x) => `${x}` },
];

// ── 고정 용어집 (DRIVER lane) ──────────────────────────────────────────────
// 기존 승인 EN canonical 의 표현 체계를 그대로 따른다. 새 heading 체계를 만들지 않는다.
const FIXED = {
  heading: {
    '주요 기능성': 'Officially recognised functions',
    '섭취량 및 섭취방법 (공식 표기 그대로)': 'Directions (exactly as officially stated)',
    '확인 가능한 기준·규격 정보': 'Labelled standard',
    '매장 전문가 문의 안내': 'Speak to our in-store expert',
    '섭취 시 참고사항': 'Points to note when taking',
    '보호자 안내': 'Guidance for carers',
    '표시 기준 (액상)': 'Labelled standard (liquid)',
  },
  foot: {
    '제품 표시사항을 함께 확인하십시오.': 'Please also check the product label.',
  },
  intro: {
    '이 제품은 식약처에 신고된 건강기능식품입니다. 공식적으로 인정된 기능성은 아래와 같습니다.':
      'This product is a health functional food notified to the Ministry of Food and Drug Safety. Its officially recognised functions are listed below.',
  },
  meta: {
    '건강기능식품 · 공식 인정 기능성 기반 매장 설명서':
      'Health functional food · in-store guide based on officially recognised functions',
    '건강기능식품 원료로 사용': 'Used as a health functional food ingredient',
    '제품 표시사항 참고': 'See the product label',
  },
  label: {
    '제품 표시사항 참고': 'See the product label',
    '셀렌': 'Selenium',
    '셀레늄(또는 셀렌)': 'Selenium',
    '홍삼제품': 'Korean red ginseng product',
    'EPA 및 DHA 함유 유지': 'EPA and DHA-containing oil',
    '녹차추출물': 'Green tea extract',
    '밀크씨슬추출물': 'Milk thistle extract',
    '베타카로틴': 'Beta-carotene',
    '테아닌': 'Theanine',
  },
};

// ── 수치 템플릿 ────────────────────────────────────────────────────────────
// 수치·단위는 절대 바꾸지 않고 그대로 옮긴다.
const NUM = String.raw`[0-9][0-9,.\s~∼-]*`;
const UNIT = String.raw`(?:mg|g|㎎|ug|㎍|μg|mcg|IU|kcal|mL|ml|L|억|만|천|CFU|정|캡슐|포|스푼|알|ml당|개)`;
const TEMPLATES = [
  // 1일 N회, 1회 M캡슐을 (충분한) 물과 함께 섭취하십시오.
  { re: new RegExp(`^1일\\s*(\\S+?)\\s*회,?\\s*1회\\s*(\\S+?)\\s*(정|캡슐|포|스푼|알|병|㎖|ml|mL|g|mg)(?:을|를)?\\s*(충분한\\s*)?물과 함께 섭취하십시오\\.?$`),
    en: (m) => `Take ${m[2]} ${{ 정: 'tablet(s)', 캡슐: 'capsule(s)', 포: 'stick pack(s)', 스푼: 'spoonful(s)', 알: 'piece(s)', 병: 'bottle(s)' }[m[3]] ?? m[3]} ${m[1]} time(s) a day with ${m[4] ? 'plenty of ' : ''}water.` },
  // N당 M CFU 이상
  { re: new RegExp(`^(${NUM}\\s*${UNIT})당\\s*(${NUM}\\s*(?:억|만|천)?)\\s*CFU 이상$`),
    en: (m) => `At least ${m[2].replace(/억/g, ' hundred million').replace(/만/g, ' ten thousand').replace(/천/g, ' thousand').replace(/\s+/g, ' ').trim()} CFU per ${m[1]}` },
  // 비타민 C 2000mg 같은 성분 뱃지
  { re: new RegExp(`^(비타민\\s*[A-Z]\\d*|아연|셀렌|셀레늄|망간|엽산|철|칼슘|마그네슘|비오틴|나이아신|판토텐산)\\s*(${NUM}\\s*${UNIT})$`),
    en: (m) => `${FIXED.label[m[1]] ?? ({ 아연: 'Zinc', 망간: 'Manganese', 엽산: 'Folate', 철: 'Iron', 칼슘: 'Calcium', 마그네슘: 'Magnesium', 비오틴: 'Biotin', 나이아신: 'Niacin', 판토텐산: 'Pantothenic acid' }[m[1]] ?? m[1].replace(/비타민\s*/, 'Vitamin '))} ${m[2]}` },
  { re: /^1일\s*(\S+?)\s*회$/, en: (m) => `${m[1]} time(s) a day` },
  { re: /^1회\s*(\S+?)\s*(정|캡슐|포|스푼|알)$/, en: (m) => `${m[1]} ${{ 정: 'tablet(s)', 캡슐: 'capsule(s)', 포: 'stick pack(s)', 스푼: 'spoonful(s)', 알: 'piece(s)' }[m[2]]} per serving` },
];

// ── 1) 명사구 사전 역산 ────────────────────────────────────────────────────
const EN_FRAME = [
  { re: /^May help with (.+)$/, id: 'help' },
  { re: /^May help to (.+)$/, id: 'help' },
  { re: /^May help support (.+)$/, id: 'help' },
  { re: /^Needed for (.+)$/, id: 'need' },
  { re: /^Needed to (.+)$/, id: 'needTo' },
  { re: /^Involved in (.+)$/, id: 'involve' },
];
// 사전 키는 공백이 제거된 형태이므로 문형도 공백 없이 매칭한다.
const FRAME_ID = [
  { ko: /^(.+?)에도움을줄수있음$/, id: 'help' },
  { ko: /^(.+?)에도움을줄수있습니다\.?$/, id: 'help' },
  { ko: /^(.+?)에도움을줌$/, id: 'help' },
  { ko: /^(.+?)하는데필요$/, id: 'needTo' },
  { ko: /^(.+?)에필요$/, id: 'need' },
  { ko: /^(.+?)에관여$/, id: 'involve' },
];

const phrase = new Map();   // koPhraseKey -> Map(en -> n)
const bump = (m, k, v) => { if (!k || !v) return; if (!m.has(k)) m.set(k, new Map()); const x = m.get(k); x.set(v, (x.get(v) ?? 0) + 1); };

// clause 사전을 역방향으로 읽어 원 KO 문자열을 복원할 수 없으므로,
// key(공백제거) 상태 그대로 문형을 적용한다.
for (const [k, en] of Object.entries(ASSETS.dict.clause)) {
  const kf = FRAME_ID.find((f) => f.ko.test(k));
  if (!kf) continue;
  const ef = EN_FRAME.find((f) => f.re.test(en));
  if (!ef || ef.id !== kf.id) continue;
  const koX = k.match(kf.ko)[1];
  const enX = en.match(ef.re)[1].replace(/\.$/, '');
  if (!koX || !enX) continue;
  // 다기능 절은 구성요소가 섞이므로 단일 기능 절만 명사구로 채택한다
  if (/·/.test(koX) || /,| and /.test(enX)) continue;
  bump(phrase, koX, enX);
}
const phraseDict = {};
const phraseConflict = [];
for (const [k, m] of phrase) {
  const e = [...m.entries()].sort((a, b) => b[1] - a[1]);
  const total = e.reduce((a, x) => a + x[1], 0);
  if (e[0][1] / total >= 0.85) phraseDict[k] = e[0][0]; else phraseConflict.push({ k, options: e.slice(0, 3) });
}

const out = {
  builtAt: new Date().toISOString(),
  approvedClauseDict: Object.keys(ASSETS.dict.clause).length,
  phraseDict: Object.keys(phraseDict).length,
  phraseConflicts: phraseConflict.length,
  fixedCounts: Object.fromEntries(Object.entries(FIXED).map(([k, v]) => [k, Object.keys(v).length])),
  templates: TEMPLATES.length,
  fixed: FIXED,
  phrase: phraseDict,
};
fs.writeFileSync(`${D}/hff-en-batch-01-glossary-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, fixed: undefined, phrase: undefined, samplePhrases: Object.entries(phraseDict).slice(0, 10) }, null, 2));
