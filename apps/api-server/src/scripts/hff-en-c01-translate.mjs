/**
 * WO-O4O-HFF-EN-C01-LABELLED-STANDARD-40896-FULL-TRANSLATION-REPAIR-V1 — 번역 엔진
 *
 * `Labelled standard` 슬롯을 영어로 바꾼다. DB 접근 없음 — 순수 함수다.
 *
 * 원칙:
 *   1) **근거 우선** — 승인 자산·프로덕션 정렬 수확본에 있으면 그것을 쓴다(사전 조회).
 *   2) **정형 문법** — 규격 라인은 숫자만 다른 같은 문법이므로 규칙으로 처리한다.
 *      숫자·단위는 **원문 그대로 옮긴다**(재계산·반올림 금지). 유일한 예외는
 *      한국어 수 단위(억)의 환산이며, 이때도 본문 수치와 **일치할 때만** 통과시킨다.
 *   3) **원자 합성** — 성상(색·형상·제형)은 원자 사전으로 합성한다.
 *   4) 셋 다 실패하면 `null` 을 돌려 **차단**한다. 추측 번역을 만들지 않는다.
 *
 * 문체: 프로덕션 EN canonical 에 이미 들어간 성상 문장을 정본으로 삼는다 —
 *   `A <설명> with a characteristic flavour and no off-taste or off-odour`
 *   (코퍼스 철자는 혼재이므로 이 계열은 flavour/colour 로 통일한다.)
 *
 * 사전 라운드는 data/hff-en-c01-a{NN}-translations-v1.json 으로 계속 추가한다.
 */
import fs from 'node:fs';
import { splitSlot, joinSlot, bodyShape, norm, HANGUL } from './hff-en-c01-lib.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';

/* ── 사전 적재 ────────────────────────────────────────────────── */
const g = JSON.parse(fs.readFileSync(`${CACHE}/hff-en-c01-glossary.json`, 'utf8'));
export const DICT = new Map();            // KO 문구 → EN (몸통·문장)
export const HEAD = new Map();            // KO 머리 → EN
export const ATOM = new Map();            // 저작 라운드가 추가하는 원자
export const ROUNDS = [];
/** 저작한 문장 목록 — 보관 문구는 정규화 열쇠로도 색인한다(`skey` 정의 뒤에 채운다). */
const AUTHORED = [];
/** 값이 영문 단어를 포함하지 않으면 번역이 아니다 — 수확기 오염에 대한 2차 방어선. */
const usable = (v) => typeof v === 'string' && /[A-Za-z]{2}/.test(v) && !/^[\d\s./,:%()-]+$/.test(v);
for (const [ko, en] of Object.entries(g.asset)) if (usable(en)) DICT.set(ko, en);
for (const [ko, v] of Object.entries(g.bodies)) if (usable(v.en)) DICT.set(ko, v.en);
for (const [ko, v] of Object.entries(g.heads)) if (usable(v.en)) HEAD.set(ko, v.en);
for (const f of fs.readdirSync(D).filter((x) => /^hff-en-c01-a\d+-translations-v1\.json$/.test(x)).sort()) {
  const j = JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8'));
  ROUNDS.push(f);
  for (const [ko, en] of Object.entries(j.head ?? {})) HEAD.set(norm(ko), en);
  for (const [ko, en] of Object.entries(j.body ?? {})) DICT.set(norm(ko), en);
  for (const [ko, en] of Object.entries(j.atom ?? {})) ATOM.set(norm(ko), en);
  AUTHORED.push(...Object.entries(j.body ?? {}));
}

/* ── 원자 사전 ────────────────────────────────────────────────── */
/** 색 형태소. 한국어 성상 표기는 `흰노란색` 처럼 형태소를 이어 붙인다. */
const COLOUR = {
  '하양': 'white', '하얀': 'white', '흰': 'white', '백': 'white', '흰색': 'white',
  '미백': 'off-white', '유백': 'milky white', '회백': 'greyish white', '상아': 'ivory', '크림': 'cream',
  '노랑': 'yellow', '노란': 'yellow', '황': 'yellow', '미황': 'pale yellow', '담황': 'pale yellow',
  '연노랑': 'pale yellow', '연황': 'pale yellow', '회황': 'greyish yellow', '황회': 'yellow-grey',
  '주황': 'orange', '오렌지': 'orange',
  '갈': 'brown', '적갈': 'reddish brown', '황갈': 'yellowish brown', '흑갈': 'blackish brown',
  '회갈': 'greyish brown', '녹갈': 'greenish brown', '자갈': 'purplish brown', '암갈': 'dark brown',
  '갈흑': 'brownish black', '다갈': 'dark brown',
  '빨간': 'red', '빨강': 'red', '적': 'red', '홍': 'red', '분홍': 'pink', '핑크': 'pink',
  '초록': 'green', '녹': 'green', '연두': 'yellowish green', '청록': 'blue-green', '녹회': 'greenish grey',
  '파랑': 'blue', '파란': 'blue', '청': 'blue', '보라': 'purple', '자주': 'reddish purple', '자': 'purple',
  '검정': 'black', '검은': 'black', '흑': 'black', '회': 'grey',
  '자줏': 'reddish purple', '보랏': 'purple', '분홍빛': 'pinkish', '무': 'colourless',
};
/** 색 수식어. 색 앞에 붙는다. */
const COLOUR_MOD = {
  '연한': 'pale', '연': 'pale', '옅은': 'pale', '엷은': 'pale', '흐린': 'dull', '밝은': 'light',
  '진한': 'deep', '짙은': 'deep', '어두운': 'dark', '탁한': 'cloudy', '선명한': 'bright', '미': 'faint',
};
const SHAPE = {
  '장방형': 'oblong', '타원형': 'oval', '장타원형': 'elongated oval', '원형': 'round', '구형': 'spherical',
  '삼각형': 'triangular', '사각형': 'square', '오각형': 'pentagonal', '육각형': 'hexagonal',
  '캡슐형': 'capsule-shaped', '아몬드형': 'almond-shaped', '럭비볼형': 'rugby-ball-shaped',
  '반구형': 'hemispherical', '원통형': 'cylindrical', '마름모형': 'diamond-shaped',
  '스틱형': 'stick', '장방': 'oblong', '타원': 'oval',
};
const FORM = {
  '분말': 'powder', '가루': 'powder', '과립': 'granules', '정제': 'tablet', '제피정제': 'film-coated tablet',
  '코팅정제': 'coated tablet', '나정': 'uncoated tablet', '츄어블정': 'chewable tablet', '정': 'tablet',
  '연질캡슐': 'soft capsule', '경질캡슐': 'hard capsule', '캡슐': 'capsule',
  '액상': 'liquid', '액제': 'liquid', '액': 'liquid', '농축액': 'concentrate', '음료': 'beverage',
  '환': 'pill', '젤리': 'jelly', '필름': 'film', '스틱': 'stick', '페이스트': 'paste', '겔': 'gel',
  '시럽': 'syrup', '차': 'tea', '바': 'bar', '구미': 'gummy', '분말스틱': 'powder stick', '내용물': 'contents',
  '캅셀': 'capsule', '경질캅셀': 'hard capsule', '연질캅셀': 'soft capsule', '내용액': 'liquid contents',
  '유상액': 'oily liquid', '현탁액': 'suspension', '유동액': 'free-flowing liquid', '고형': 'solid',
};
/** 제형 앞에 붙는 성질 수식어 */
const QUAL_PRE = {
  '투명한': 'clear', '투명의': 'clear', '투명': 'clear', '반투명한': 'translucent',
  '반투명': 'translucent', '불투명한': 'opaque', '불투명': 'opaque',
  '점도가': 'viscous', '점조성을': 'viscous', '점조성이': 'viscous', '점조성': 'viscous',
  '점성이': 'viscous', '유동성': 'free-flowing', '유동성이': 'free-flowing',
  '점박이가': 'speckled', '점박이를': 'speckled', '점박이': 'speckled',
  '불규칙한': 'irregular', '제피': 'film-coated', '코팅': 'coated', '장용성': 'enteric-coated',
  '츄어블': 'chewable', '입자성이': '__PARTICULATE__', '입자성': '__PARTICULATE__',
};
/** QUAL_PRE 뒤에 따라오며 의미를 갖지 않는 조각 */
const QUAL_TAIL = new Set(['있는', '지닌', '가진', '있고', '있으며', '포함한', '함유한', '띤', '띠는']);

/* ── 성상 품질 문구 ───────────────────────────────────────────── */
const Q_FLAVOUR = 'with a characteristic flavour and no off-taste or off-odour';
const Q_COLOUR = 'with a characteristic colour and flavour and no off-taste or off-odour';
/** 이미/이취 사이의 구분자는 원문마다 제각각이다(`,` `·` `.` `∙` `와`). */
const SEP = '(?:[,·․、.∙・]|와|과)?\\s*';
/** `고유의 향미가 있고` 계열 어미 변형 */
const HAVE = '(?:가\\s*있고|가\\s*있으며|가\\s*있는|를\\s*가지며|를\\s*가지고\\s*있으며|를\\s*가지고\\s*있는|를\\s*가지고|를\\s*지니고|를\\s*지니며|를\\s*가진|를\\s*지닌)';
/** `이취가 없는` 계열 어미 변형 */
const NONE = '(?:없는|없으며|없고|없이|없어야\\s*하는)';
const Q_NONE = 'free from off-taste and off-odour';
/** 품질 문구 접두 — `고유의 (색택과 )?향미…이미·이취가 없는 <형상설명>` */
const PREFIX_RE = [
  [new RegExp('^고유의\\s*색택과\\s*향미' + HAVE + SEP + '\\s*이미' + SEP + '이취가\\s*' + NONE + '\\s*'), Q_COLOUR],
  [new RegExp('^고유의\\s*향미' + HAVE + SEP + '\\s*이미' + SEP + '이취가\\s*' + NONE + '\\s*'), Q_FLAVOUR],
  [new RegExp('^이미' + SEP + '이취가\\s*없(?:고|으며|이)' + SEP + '\\s*고유의\\s*색택과\\s*향미' + HAVE + '\\s*'), Q_COLOUR],
  [new RegExp('^이미' + SEP + '이취가\\s*없(?:고|으며|이)' + SEP + '\\s*고유의\\s*향미' + HAVE + '\\s*'), Q_FLAVOUR],
  /* 향미 절이 아예 없는 형태 — `이미, 이취가 없는 암갈색의 액상` */
  [new RegExp('^이미' + SEP + '이취가\\s*' + NONE + '\\s*'), Q_NONE],
];
/** 품질 문구가 뒤에 오는 형태 — `<형상설명>으로 이미, 이취가 없음` */
const SUFFIX_RE = [
  [new RegExp('(?:으로서|으로|로서|로|이며|이고)?' + SEP + '\\s*고유의\\s*색택과\\s*향미를\\s*(?:가지며|가지고|지니며)' + SEP + '\\s*이미' + SEP + '이취가\\s*없(?:음|다|어야\\s*함|어야\\s*한다)\\.?$'), Q_COLOUR],
  [new RegExp('(?:으로서|으로|로서|로|이며|이고)?' + SEP + '\\s*고유의\\s*향미를\\s*(?:가지며|가지고|지니며)' + SEP + '\\s*이미' + SEP + '이취가\\s*없(?:음|다|어야\\s*함|어야\\s*한다)\\.?$'), Q_FLAVOUR],
  [new RegExp('(?:으로서|으로|로서|로|이며|이고)?' + SEP + '\\s*이미' + SEP + '이취가\\s*없(?:음|다|어야\\s*함|어야\\s*한다)\\.?$'), Q_NONE],
];
/** 형상 설명이 없는 독립 문장 — 의무형(`없어야 함`) */
const STANDALONE_RE = [
  [new RegExp('^고유의\\s*색택과\\s*향미를\\s*(?:가지며|가지고|지니며|지니고)' + SEP + '\\s*이미' + SEP + '이취가\\s*없어야\\s*(?:함|한다)\\.?$'), 'Must have its characteristic colour and flavour, with no off-taste or off-odour'],
  [new RegExp('^고유의\\s*향미를\\s*(?:가지며|가지고|지니며|지니고)' + SEP + '\\s*이미' + SEP + '이취가\\s*없어야\\s*(?:함|한다)\\.?$'), 'Must have its characteristic flavour, with no off-taste or off-odour'],
  [new RegExp('^고유의\\s*색택과\\s*향미가\\s*있고' + SEP + '\\s*이미' + SEP + '이취가\\s*없어야\\s*(?:함|한다)\\.?$'), 'Must have its characteristic colour and flavour, with no off-taste or off-odour'],
  [/^이취가\s*없어야\s*(?:함|한다)\.?$/, 'Must be free from off-odour'],
  [/^이미\s*[,·]?\s*이취가\s*없어야\s*(?:함|한다)\.?$/, 'Must be free from off-taste and off-odour'],
];

/* ── 색 형태소 분해 ───────────────────────────────────────────── */
const COLOUR_KEYS = Object.keys(COLOUR).sort((a, b) => b.length - a.length);
const MOD_KEYS = Object.keys(COLOUR_MOD).sort((a, b) => b.length - a.length);

/**
 * 색 어절을 영어로. `흰노란색` 처럼 형태소가 붙어 있으면 **긴 것부터** 잘라 읽고
 * 원문 순서대로 하이픈으로 잇는다(어느 쪽이 우세한지 임의로 판단하지 않는다).
 * 하나라도 못 읽으면 `null` — 차단이 기본이다.
 */
export function colourPhrase(koRaw) {
  const t = norm(koRaw).replace(/빛이\s*도는/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const words = t.split(/\s+/).filter(Boolean);
  const out = [];
  for (const w0 of words) {
    const w = w0.replace(/[빛의]$/, '');
    let s = w.replace(/색$/, '');
    const extra = ATOM.get(w0) ?? ATOM.get(w) ?? ATOM.get(s);
    if (extra) { out.push(extra); continue; }
    /* 형태소는 **긴 것부터** 읽는다. `연두` 를 `연`(수식어)+`두` 로 잘못 자르면 안 된다. */
    const mods = [], cols = [];
    while (s.length) {
      const ck = COLOUR_KEYS.find((k) => s.startsWith(k));
      const mk = MOD_KEYS.find((k) => s.startsWith(k) && s.length > k.length);
      if (ck && (!mk || ck.length >= mk.length)) { cols.push(COLOUR[ck]); s = s.slice(ck.length); s = s.replace(/^색/, ''); continue; }
      if (mk) { mods.push(COLOUR_MOD[mk]); s = s.slice(mk.length); continue; }
      return null;
    }
    if (!cols.length) return null;
    out.push([...mods, cols.join('-')].join(' '));
  }
  if (!out.length) return null;
  return out.join(' ');
}

/* ── 형상 설명 합성 ───────────────────────────────────────────── */
/** 제형 이름은 `원형정제` `코팅환제` `액상제품` 처럼 붙어 나온다. 뒤에서부터 잘라 읽는다. */
function formWord(w) {
  const direct = FORM[w] ?? ATOM.get(w);
  if (direct) return direct;
  let suffix = '';
  let t = w;
  const P = /(제품|형)$/.exec(t);
  if (P && P[1] === '제품') { suffix = ' product'; t = t.slice(0, -2); }
  for (let i = 1; i < t.length; i++) {
    const a = t.slice(0, i), b = t.slice(i);
    const av = SHAPE[a] ?? QUAL_PRE[a] ?? ATOM.get(a) ?? FORM[a];
    const bv = FORM[b] ?? ATOM.get(b);
    if (av && bv && av !== '__PARTICULATE__') return `${av} ${bv}${suffix}`;
  }
  const whole = FORM[t] ?? ATOM.get(t);
  return whole ? whole + suffix : null;
}

/**
 * `연한 노랑색의 장방형 제피정제` → `pale yellow oblong film-coated tablet`
 * `A색의 내용물을 함유한 B색의 타원형 연질캡슐` → `... soft capsule containing ... contents`
 *
 * `의` 로 자르지 않고 **어절을 하나씩 읽는다** — `미황색 분말` 처럼 `의` 가 없는 표기와
 * `점박이가 있는 흰색의 …` 처럼 수식어가 색 앞에 오는 표기를 함께 받기 위해서다.
 * 하나라도 못 읽으면 `null` — 차단이 기본이다.
 */
export function describeForm(tailRaw) {
  let t = norm(tailRaw).replace(/[.]$/, '');
  if (!t) return null;
  const inner = /^(.+?)을?를?\s*(?:함유한|포함한|가진|담은)\s*(.+)$/.exec(t);
  if (inner && /(내용물|분말|과립|액|겔)$/.test(norm(inner[1]).replace(/의$/, ''))) {
    const what = norm(inner[1]).replace(/의$/, '');
    const wm = /^(.*?)의?\s*(내용물|분말|과립|액|겔)$/.exec(what);
    const icDesc = wm && wm[1] ? describeForm(`${wm[1]}의 ${wm[2]}`) : null;
    const outer = describeForm(inner[2]);
    if (!icDesc || !outer) return null;
    return `${outer} containing ${icDesc}`;
  }
  const words = t.split(/\s+/).filter(Boolean);
  const colours = [], pre = [], post = [];
  let shape = '', form = '', pendingMod = [];
  for (let wi = 0; wi < words.length; wi++) {
    const raw = words[wi];
    let w = raw.replace(/의$/, '');
    if (!w) continue;
    /* `<색>색 점박이가 있는 <바탕색>의 …` — 점박이의 색을 바탕색과 한 덩어리로 묶으면
       색이 셋으로 읽힌다. 점박이 색은 떼어 `with <색> speckles` 로 뒤에 붙인다. */
    if (/^점박이/.test(words[wi + 1] ?? '')) {
      const sc = colourPhrase(w);
      if (sc) {
        post.push(`with ${[...pendingMod, sc].join(' ')} speckles`);
        pendingMod = []; wi++;
        while (QUAL_TAIL.has(words[wi + 1] ?? '')) wi++;
        continue;
      }
    }
    if (w === '또는') { colours.push('__OR__'); continue; }
    if (QUAL_TAIL.has(w)) continue;
    /* `연한 노랑 빛이 도는 백색` — 색조를 나타내는 보조 어절은 색 판독에 쓰지 않는다. */
    if (/^(빛이|빛을|빛|도는|띠는|나는|섞인)$/.test(w)) continue;
    /* `빨간 갈색(적갈색)` — 괄호 안이 같은 색의 다른 표기다. 둘 다 남긴다. */
    const cp = /^(.+?)[(（](.+?)[)）]$/.exec(w);
    if (cp) { const ca = colourPhrase(cp[1]), cb = colourPhrase(cp[2]); if (ca && cb) { colours.push(`${[...pendingMod, ca].join(' ')} (${cb})`); pendingMod = []; continue; } }
    if (QUAL_PRE[w]) { const v = QUAL_PRE[w]; if (v === '__PARTICULATE__') post.push('containing particulate matter'); else pre.push(v); continue; }
    if (COLOUR_MOD[w]) { pendingMod.push(COLOUR_MOD[w]); continue; }
    if (SHAPE[w]) { shape = shape ? shape + ' ' + SHAPE[w] : SHAPE[w]; continue; }
    /* 색은 `…색` 이거나 형태소로 읽히는 어절이다. 제형/형상보다 **뒤에** 판정한다. */
    const f = formWord(w);
    if (f && !/색$/.test(w)) { form = form ? form + ' ' + f : f; continue; }
    /* `미백색~미황색` — 색의 범위. 원문 순서대로 `A to B` 로 옮긴다. */
    if (/[~〜～∼]/.test(w)) {
      const ends = w.split(/[~〜～∼]/).map((x) => colourPhrase(x));
      if (ends.length === 2 && ends.every(Boolean)) { colours.push([...pendingMod, `${ends[0]} to ${ends[1]}`].join(' ')); pendingMod = []; continue; }
    }
    const c = colourPhrase(w);
    if (c) { colours.push([...pendingMod, c].join(' ')); pendingMod = []; continue; }
    /* `갈색투명` — 색과 성질 수식어가 붙어 있는 형태 */
    let split = false;
    for (let k = 1; k < w.length && !split; k++) {
      const ca = colourPhrase(w.slice(0, k)), qb = QUAL_PRE[w.slice(k)] ?? FORM[w.slice(k)] ?? ATOM.get(w.slice(k));
      if (!ca || !qb || qb === '__PARTICULATE__') continue;
      colours.push([...pendingMod, ca].join(' ')); pendingMod = [];
      if (QUAL_PRE[w.slice(k)]) pre.push(qb); else form = form ? form + ' ' + qb : qb;
      split = true;
    }
    if (split) continue;
    if (f) { form = form ? form + ' ' + f : f; continue; }
    return null;
  }
  if (pendingMod.length) return null;
  if (!form) return null;
  let cEn = '';
  for (const c of colours) cEn = cEn ? (c === '__OR__' ? cEn + ' or' : cEn + ' ' + c) : (c === '__OR__' ? '' : c);
  const core = [cEn, ...pre, shape, form].filter(Boolean).join(' ');
  return post.length ? `${core} ${post.join(' ')}` : core;
}

/** 성상 전체. 품질 문구 + 형상 설명. */
export function appearance(tRaw) {
  const t = norm(tRaw);
  const bf = bracketForm(t);
  if (bf) return bf;
  for (const [re, en] of STANDALONE_RE) if (re.test(t)) return en;
  for (const [re, q] of PREFIX_RE) {
    if (!re.test(t)) continue;
    const tail = t.replace(re, '');
    if (!tail.trim()) return null;
    const d = describeForm(tail);
    return d ? sentence(d, q) : null;
  }
  for (const [re, q] of SUFFIX_RE) {
    if (!re.test(t)) continue;
    const headPart = t.replace(re, '');
    if (!headPart.trim()) return null;
    const d = describeForm(headPart);
    return d ? sentence(d, q) : null;
  }
  /* 품질 문구 없이 형상만 있는 경우 — `갈색의 액상` */
  const d = describeForm(t);
  return d ? sentence(d, '') : null;
}

/**
 * 성상 문장을 만든다.
 * - 관사는 모음 소리 앞에서 `An` 이다(`An orange …`).
 * - 형상 설명 자체가 `with …` 절로 끝나면 품질 문구 앞에 쉼표를 넣는다
 *   (`… with brown speckles, with a characteristic flavour …`).
 */
function sentence(desc, quality) {
  const art = /^[aeiou]/i.test(desc) ? 'An' : 'A';
  if (!quality) return `${art} ${desc}`;
  return `${art} ${desc}${/\swith\s/.test(desc) ? ',' : ''} ${quality}`;
}

export function bracketForm(t) {
  const m = /^\[\s*([^\]]+?)\s*\]$/.exec(norm(t));
  if (!m) return null;
  const inner = m[1].replace(/(\d+)$/, '').trim(), suffix = (/(\d+)$/.exec(m[1]) ?? [])[1] ?? '';
  /* `[멀티비타민 정제]` 처럼 여러 어절이 오므로 형상 설명기에 맡긴다. */
  const f = FORM[inner] ?? ATOM.get(inner) ?? describeForm(inner);
  if (!f) return null;
  const cap = f.charAt(0).toUpperCase() + f.slice(1);
  return `[${cap}${suffix ? ' ' + suffix : ''}]`;
}

/* ── 수치 도우미 ──────────────────────────────────────────────── */
const U = (u) => String(u).replaceAll('㎎', 'mg').replaceAll('㎏', 'kg').replaceAll('㎖', 'mL').replace(/^ml$/, 'mL').replaceAll('㎍', 'μg').replaceAll('㎕', 'μL').replaceAll('ℓ', 'L');
/**
 * 표시량 괄호 안의 값. 수치는 그대로 두고 단위의 CJK 호환문자만 편다.
 * 괄호 안에 한글이 섞이는 경우가 있다 — `3,000억 CFU/g`, `378mg/1.0g, 1회 섭취기준`,
 * `니코틴산아미드로서 15mg`. 옮길 수 없으면 `null` 로 차단한다.
 */
function num(s) {
  let t = U(norm(s)).replace(/\s*\/\s*/g, ' / ');
  if (!HANGUL.test(t)) return t;
  t = t.replace(/([\d,.]+)\s*억/g, (_, v) => { const e = eokToEnglish(v); return e ?? `${v}억`; });
  t = t.replace(/,?\s*1\s*회\s*섭취\s*기준/g, ', per serving');
  t = t.replace(/(\S+)\s*으?로서\s*/g, (_, w) => { const e = HEAD.get(hkey(w)) ?? HEADK.get(hkey(w)); return e ? `as ${e.charAt(0).toLowerCase() + e.slice(1)} ` : `${w}로서 `; });
  return HANGUL.test(t) ? null : t.replace(/\s+/g, ' ').trim();
}
const LIMIT_EN = { '이하': 'or less', '이상': 'or more', '미만': 'less than', '초과': 'more than' };
/** `2,000억` → 200 billion. 본문 수치와 대조해 **일치할 때만** 쓴다. */
function eokToEnglish(numStr, expect) {
  const v = Number(String(numStr).replace(/,/g, ''));
  if (!Number.isFinite(v)) return null;
  const total = v * 1e8;
  if (expect != null && Math.abs(total - expect) / expect > 1e-9) return null;
  if (total >= 1e12) return `${+(total / 1e12).toPrecision(12)} trillion`;
  if (total >= 1e9) return `${+(total / 1e9).toPrecision(12)} billion`;
  if (total >= 1e6) return `${+(total / 1e6).toPrecision(12)} million`;
  return String(total);
}

/* ── 몸통 번역 ────────────────────────────────────────────────── */
/**
 * 보관 문구의 표기 변형을 하나로 접는 열쇠.
 *
 * 같은 문장이 띄어쓰기·구분자·어미만 바꿔 수백 가지로 나타난다
 * (`피하여/피해/피하고`, `보관하십시오/보관한다/보관`, `영·유아/영유아/영,유아`).
 * **저작한 문장에만** 이 열쇠를 걸어 변형을 자동으로 흡수한다.
 * 부정형(`마십시오`)은 건드리지 않는다 — 의미가 뒤집히면 안 된다.
 */
export function skey(s) {
  let t = norm(s);
  if (!/보관|유통|직사광선|실온/.test(t)) return null;
  if (/마십시오|마시기|말것|말아야/.test(t)) return null;
  t = t.replace(/\s+/g, '').replace(/[·ㆍ・･,，、]/g, '').replace(/[.。]+$/, '');
  t = t.replace(/받지아니하는|받지않는/g, '피하').replace(/피하여서|피하여|피해서|피해|피하고|피한/g, '피하');
  t = t.replace(/(보관|유통|주의)(하십시오|하세요|하시기바랍니다|하시길바랍니다|합니다|한다|하여야한다|해야한다|할것|하시고|하며|하도록)/g, '$1');
  t = t.replace(/영유아|영ㆍ유아|영·유아|유아/g, '영유아');
  t = t.replace(/곳에서/g, '곳에');
  return t;
}
const NORMDICT = new Map();
for (const [ko, en] of AUTHORED) { const k = skey(ko); if (k) NORMDICT.set(k, en); }

export function translateBody(bodyRaw) {
  const t = norm(bodyRaw);
  if (!HANGUL.test(t)) return t;
  const hit = DICT.get(t);
  if (hit) return hit;
  const sk = skey(t);
  if (sk) { const nh = NORMDICT.get(sk); if (nh) return nh; }

  let m;
  /* 슬롯 전체가 괄호 주석인 경우 — `(시험방법: 관능검사를 실시하여 …)` */
  m = /^[(（]\s*([\s\S]*?)\s*[)）]?$/.exec(t);
  if (m && t.startsWith('(') && HANGUL.test(m[1])) {
    const innerEn = translateBody(m[1]);
    if (innerEn) return `(${innerEn}${t.endsWith(')') ? ')' : ''}`;
  }
  /* `시험방법: X` — 콜론이 몸통 안에 있는 형태 */
  m = /^([^:：]{1,30})\s*[:：]\s*([\s\S]+)$/.exec(t);
  if (m && HANGUL.test(m[1])) {
    const hEn = translateHead(m[1]), bEn = HANGUL.test(m[2]) ? translateBody(m[2]) : norm(m[2]);
    if (hEn && bEn) return `${hEn}: ${bEn}`;
  }
  /* `A, B` 나열 — 각 조각이 모두 옮겨질 때만.
     `3,000` 처럼 **천 단위 구분자**가 있으면 나열이 아니다. 쪼개면 수치가 깨진다. */
  if (/,/.test(t) && !/\d\s*,\s*\d/.test(t) && t.length <= 120) {
    const parts = t.split(/\s*,\s*/).map(norm).filter(Boolean);
    if (parts.length >= 2 && parts.every((x) => x.length > 1 && !/^\d+$/.test(x) && !/[.]$/.test(x))) {
      const en = parts.map((x) => (HANGUL.test(x) ? (translateHead(x) ?? translateBody(x)) : x));
      if (en.every(Boolean)) return en.join(', ');
    }
  }

  /* ── 표시량 계열 ── */
  /* 표시량(A/B)의 X~Y%  |  표시량(A/B)의 X% 이상 Y% 이하 */
  m = /^(.*?)표시량\s*[(（\[]([^)）\]]*)[)）\]]\s*의\s*([\d.,]+)\s*%?\s*(?:[~〜～-]|이상)\s*([\d.,]+)\s*%\s*(?:이하)?\.?$/.exec(t);
  if (m) { const lead = specLead(m[1]), v = num(m[2]); return (lead === null || v === null) ? null : `${lead}labelled (${v}), ${m[3]}~${m[4]}%`; }
  /* 표시량의 X ~ Y% (표시량 : A / B) */
  m = /^(.*?)표시량의\s*([\d.,]+)\s*%?\s*(?:[~〜～-]|이상)\s*([\d.,]+)\s*%\s*(?:이하\s*)?[(（]\s*표시량\s*[:：]?\s*([^)）]*)[)）]\.?$/.exec(t);
  if (m) { const lead = specLead(m[1]), v = num(m[4]); return (lead === null || v === null) ? null : `${lead}labelled (${v}), ${m[2]}~${m[3]}%`; }
  /* A / B (표시량의 X-Y%) */
  m = /^([^()（）]*?)\s*[(（]\s*표시량의\s*([\d.,]+)\s*%?\s*[~〜～-]\s*([\d.,]+)\s*%\s*[)）]\.?$/.exec(t);
  if (m && !HANGUL.test(m[1])) { const v = num(m[1]); if (v !== null) return `labelled (${v}), ${m[2]}~${m[3]}%`; }
  /* 표시량의 X% 이상 / 이하 */
  m = /^(.*?)표시량\s*(?:[(（]([^)）]*)[)）])?\s*의?\s*([\d.,]+)\s*%\s*(이상|이하)\.?$/.exec(t);
  if (m) {
    const lead = specLead(m[1]);
    if (lead === null) return null;
    const v2 = m[2] ? num(m[2]) : '';
    if (v2 === null) return null;
    const of = m[2] ? ` of the labelled amount (${v2})` : ' of the labelled amount';
    return `${lead}${m[4] === '이상' ? 'at least' : 'at most'} ${m[3]}%${of}`;
  }
  /* 표시량 이상 */
  m = /^표시량\s*(?:[(（\[]([^)）\]]*)[)）\]]\s*)?(?:의\s*)?이상\.?$/.exec(t);
  if (m) { const v = m[1] ? num(m[1]) : ''; if (v === null) return null; return m[1] ? `at least the labelled amount (${v})` : 'at least the labelled amount'; }

  /* ── 한계치 계열 ── */
  m = /^([\d.,]+)\s*(mg\/kg|mg\/g|g\/kg|㎎\/㎏|mg|㎎)?\s*(이하|이상|미만|초과)\.?$/.exec(t);
  if (m) return `${m[1]}${m[2] ? ' ' + U(m[2]) : ''} ${LIMIT_EN[m[3]]}`;
  m = /^([\d.,]+)\s*(이하|이상|미만|초과)\s*[(（]\s*(mg\/kg|㎎\/㎏)\s*[)）]\.?$/.exec(t);
  if (m) return `${m[1]} ${U(m[3])} ${LIMIT_EN[m[2]]}`;
  m = /^([\d.,]+)\s*(이하|이상|미만|초과)\s*이어야\s*한다\.?$/.exec(t);
  if (m) return `Must be ${m[1]} ${LIMIT_EN[m[2]]}`;
  /* 1mL당 N 이하 · N/mL 이하 · N cfu/mL 이하 */
  m = /^(?:1\s*(mL|ml|㎖)\s*당\s*([\d.,]+)|([\d.,]+)\s*(?:cfu|CFU|개)?\s*\/\s*(mL|ml|㎖))\s*(이하|이상|미만)\.?$/.exec(t);
  if (m) return `${m[2] ?? m[3]} per ${U(m[1] ?? m[4])} ${LIMIT_EN[m[5]]}`;
  m = /^([\d.,]+)\s*(이하|이상)\s*[(（]\s*1\s*(mL|ml|㎖)\s*당\s*[)）]\.?$/.exec(t);
  if (m) return `${m[1]} per ${U(m[3])} ${LIMIT_EN[m[2]]}`;
  /* 지수 표기 CFU — `2.0 X 10^11 CFU/g (2,000억) 이상` */
  m = /^([\d.]+)\s*[Xx×]\s*10\^?([\d]+)\s*(CFU|cfu|개)\s*\/\s*(g|mL|ml|㎖)\s*(?:[(（]\s*([\d,]+)\s*억\s*[)）]\s*)?(이상|이하)\.?$/.exec(t);
  if (m) {
    const base = Number(m[1]) * Math.pow(10, Number(m[2]));
    let gloss = '';
    if (m[5]) { const e = eokToEnglish(m[5], base); if (!e) return null; gloss = ` (${e})`; }
    return `${m[1]} × 10^${m[2]} CFU/${U(m[4])}${gloss} ${LIMIT_EN[m[6]]}`;
  }
  /* 평문 자릿수 CFU — `200,000,000,000(2,000억) CFU/g 이상` */
  m = /^([\d,]+)\s*(?:[(（]\s*([\d,]+)\s*억\s*[)）])?\s*(CFU|cfu|개)\s*\/\s*(g|mL|ml|㎖)\s*(이상|이하)\.?$/.exec(t);
  if (m) {
    const base = Number(m[1].replace(/,/g, ''));
    let gloss = '';
    if (m[2]) { const e = eokToEnglish(m[2], base); if (!e) return null; gloss = ` (${e})`; }
    return `${m[1]} CFU/${U(m[4])}${gloss} ${LIMIT_EN[m[5]]}`;
  }
  /* 시간 */
  m = /^([\d.,]+)\s*분\s*이내\.?$/.exec(t);
  if (m) return `within ${m[1]} minutes`;
  m = /^적합\s*[(（]\s*([\d.,]+)\s*분\s*이내\s*[)）]\.?$/.exec(t);
  if (m) return `Conforms (within ${m[1]} minutes)`;
  m = /^적합\s*[(（]\s*음성\s*[)）]\.?$/.exec(t);
  if (m) return 'Conforms (negative)';
  m = /^적합\s*[(（]\s*([\d.,]+)\s*(이하|이상)\s*[)）]\.?$/.exec(t);
  if (m) return `Conforms (${m[1]} ${LIMIT_EN[m[2]]})`;
  /* 유통기한 */
  m = /^제조일\s*(?:로\s*)?부터\s*([\d.,]+)\s*(개월|년)\s*(까지)?\.?$/.exec(t);
  if (m) return `${m[3] ? 'Up to ' : ''}${m[1]} ${unitTime(m[1], m[2])} from the date of manufacture`;
  m = /^([\d.,]+)\s*(개월|년)\s*(까지)?\.?$/.exec(t);
  if (m) return `${m[3] ? 'Up to ' : ''}${m[1]} ${unitTime(m[1], m[2])}`;
  /* 단문 상수 */
  const CONST = {
    '음성': 'Negative', '음 성': 'Negative', '음성(-)': 'Negative (-)', '양성': 'Positive',
    '음성이어야 한다': 'Must be negative', '음성이어야 함': 'Must be negative',
    '불검출': 'Not detected', '적합': 'Conforms', '확인': 'Confirmed', '해당없음': 'Not applicable',
    '중금속': 'Heavy metals', '기준규격': 'Standard', '적합함': 'Conforms',
  };
  const bare = t.replace(/\.$/, '');
  if (CONST[bare]) return CONST[bare] + (t.endsWith('.') ? '.' : '');
  /* ── 붕해·미생물 규격 계열 ── */
  /* `(mg/kg) : 1.0 이하` — 머리는 이미 영어이고 단위·수치만 남은 형태 */
  m = /^[(（]\s*([^)）]*)\s*[)）]\s*[:：]?\s*([\d.,]+)\s*(이하|이상|미만|초과)\.?$/.exec(t);
  if (m && !HANGUL.test(m[1])) return `(${U(m[1])}): ${m[2]} ${LIMIT_EN[m[3]]}`;
  m = /^([\d.,]+)\s*[(（]\s*([^)）]*)\s*[)）]\s*(이하|이상|미만|초과)\.?$/.exec(t);
  if (m && !HANGUL.test(m[2])) return `${m[1]} ${U(m[2])} ${LIMIT_EN[m[3]]}`;
  /* `100이하/ml` `100 이하/mL` `100/1mL 이하` */
  m = /^([\d.,]+)\s*(이하|이상)\s*\/\s*(1\s*)?(mL|ml|㎖|g|㎍)\.?$/.exec(t);
  if (m) return `${m[1]} per ${U(m[4])} ${LIMIT_EN[m[2]]}`;
  m = /^([\d.,]+)\s*\/\s*(?:1\s*)?(mL|ml|㎖|g)\s*(이하|이상)\.?$/.exec(t);
  if (m) return `${m[1]} per ${U(m[2])} ${LIMIT_EN[m[3]]}`;
  /* `1g당 3,000 이하` `1 ㎖당 100 이하` */
  m = /^(?:1\s*)?(g|mL|ml|㎖|㎏|kg)\s*당\s*([\d.,]+)\s*(이하|이상|미만)\.?$/.exec(t);
  if (m) return `${m[2]} per ${U(m[1])} ${LIMIT_EN[m[3]]}`;
  /* `1.0 이상 9.0 이하` */
  m = /^([\d.,]+)\s*이상\s*([\d.,]+)\s*이하\.?$/.exec(t);
  if (m) return `${m[1]} or more and ${m[2]} or less`;
  /* 시간·붕해 */
  m = /^([\d.,]+)\s*분\.?$/.exec(t);
  if (m) return `${m[1]} minutes`;
  m = /^([\d.,]+)\s*분\s*이내\s*(붕해|붕해될\s*것)\.?$/.exec(t);
  if (m) return `Disintegrates within ${m[1]} minutes`;
  m = /^([\d.,]+)\s*분\s*이내\s*적합\.?$/.exec(t);
  if (m) return `Conforms within ${m[1]} minutes`;
  m = /^적합\s*[(（]\s*([\d.,]+)\s*분\s*이내\s*붕해\s*[)）]\.?$/.exec(t);
  if (m) return `Conforms (disintegrates within ${m[1]} minutes)`;
  m = /^[(（]\s*([\d.,]+)\s*분\s*이내\s*[)）]\s*적합(?:하여야\s*한다|해야\s*한다)\.?$/.exec(t);
  if (m) return `Must conform (within ${m[1]} minutes)`;
  m = /^물(?:에서|,)\s*([\d.,]+)\s*분\s*이내\.?$/.exec(t);
  if (m) return `Within ${m[1]} minutes in water`;
  m = /^물을\s*시험액으로\s*([\d.,]+)\s*분\s*이내\s*적합\.?$/.exec(t);
  if (m) return `Conforms within ${m[1]} minutes using water as the test solution`;
  m = /^제?\s*1\s*액(?:에서)?\s*([\d.,]+)\s*분(?:\s*이내)?\s*,\s*제?\s*2\s*액(?:에서)?\s*([\d.,]+)\s*분\s*이내\.?$/.exec(t);
  if (m) return `Within ${m[1]} minutes in the first fluid and within ${m[2]} minutes in the second fluid`;
  /* `일일섭취량 중 300 이하` */
  m = /^일일섭취량\s*중\s*([\d.,]+)\s*(이하|이상)\.?$/.exec(t);
  if (m) return `${m[1]} ${LIMIT_EN[m[2]]} per daily intake`;

  /* `납(mg/kg) 1.0이하` — 콜론 없이 항목명·단위·수치가 이어진 형태 */
  m = /^(.+?)\s*[(（]\s*([^)）]*)\s*[)）]\s*([\d.,]+)\s*(이하|이상|미만|초과)\.?$/.exec(t);
  if (m && !HANGUL.test(m[2])) { const h = translateHead(m[1]); if (h) return `${h} (${U(m[2])}) ${m[3]} ${LIMIT_EN[m[4]]}`; }
  /* `100,000,000개/2g 이상` — 마릿수 단위 */
  m = /^([\d,.]+)\s*(?:개|CFU|cfu)?\s*\/\s*([\d.]*\s*(?:g|mL|ml|㎖|kg))\s*(이상|이하)\.?$/.exec(t);
  if (m) return `${m[1]} per ${U(norm(m[2]))} ${LIMIT_EN[m[3]]}`;
  /* `100이하(ml 당)` `3,000이하/1 ml당` `100cfu이하/mL` */
  m = /^([\d,.]+)\s*(?:cfu|CFU)?\s*(이하|이상)\s*[(（]\s*(?:1\s*)?(mL|ml|㎖|g)\s*당\s*[)）]\.?$/.exec(t);
  if (m) return `${m[1]} per ${U(m[3])} ${LIMIT_EN[m[2]]}`;
  m = /^([\d,.]+)\s*(?:cfu|CFU)?\s*(이하|이상)\s*\/\s*(?:1\s*)?(mL|ml|㎖|g)\s*당?\.?$/.exec(t);
  if (m) return `${m[1]} per ${U(m[3])} ${LIMIT_EN[m[2]]}`;
  /* `3mg/33g의 80%이상` */
  m = /^([^가-힣]+?)\s*의\s*([\d.,]+)\s*%\s*(이상|이하)\.?$/.exec(t);
  if (m) return `${m[3] === '이상' ? 'at least' : 'at most'} ${m[2]}% of ${norm(m[1])}`;

  const bk = bracketForm(t);
  if (bk) return bk;
  /* `[기준규격]` 처럼 대괄호 안이 항목명인 경우 */
  m = /^\[\s*([^\]]+?)\s*\]$/.exec(t);
  if (m) { const h = translateHead(m[1]) ?? DICT.get(norm(m[1])); if (h) return `[${h}]`; }

  /* 꼬리 괄호 주석 — `… (농축액에 한함)` : 본문과 주석을 따로 옮겨 다시 붙인다. */
  m = /^(.+?)\s*[(（]\s*([^)）]*[가-힣][^)）]*)\s*[)）]\.?$/.exec(t);
  if (m) {
    const note = DICT.get(norm(m[2])) ?? translateBody(m[2]);
    const rest = HANGUL.test(m[1]) ? translateBody(m[1]) : norm(m[1]);
    if (note && rest) return `${rest} (${note})`;
  }
  /* 앞부분이 이미 영어이고 꼬리에 한글 한정어만 남은 경우 — `labelled (…), 80% 이상` */
  m = /^([^가-힣]+?)\s*(이하|이상|미만|초과)\.?$/.exec(t);
  if (m) return `${norm(m[1])} ${LIMIT_EN[m[2]]}`;

  const ap = appearance(t);
  if (ap) return ap;
  /* 여러 문장이 한 슬롯에 들어간 경우 — 보관 문구가 대표적이다.
     문장별로 승인 자산을 조회한다. **전부** 맞을 때만 통과시킨다. */
  const sc = sentenceCompose(t);
  if (sc) return sc;
  /* 항목명이 몸통 자리에 온 경우 — `진세노사이드 Rg1, Rb1 및 Rg3의 합`.
     수치·한계 표현이 들어 있으면 항목명이 아니라 규격 문장이므로 **머리로 대체하지 않는다**
     (대체하면 `…의 합으로 8mg/g 이상` 의 수치가 통째로 사라진다). */
  if (t.length <= 40 && !/[.]$/.test(t) && !/이하|이상|미만|초과|이내/.test(t)) {
    const h = translateHead(t);
    if (h) { const kn = (t.match(/\d[\d.,]*/g) ?? []).map((x) => x.replace(/,/g, '')); 
             if (kn.every((x) => h.replace(/,/g, '').includes(x))) return h; }
  }
  return null;
}

/**
 * 한 슬롯에 여러 조각이 들어간 몸통을 조각 단위로 옮긴다.
 *
 * 보관 문구는 `1. A 2. B 3. C` `① A ② B` `실온 / 1)A 2)B` 처럼 **번호로 이어 붙은**
 * 형태가 대부분이고, 그 조각들은 같은 기본 문장의 반복이다. 번호·구분자는 원문 그대로
 * 옮기고 조각만 사전으로 바꾼다. 조각 하나라도 근거가 없으면 `null` — 부분 번역은 남기지 않는다.
 */
const MARKER = /(?:^|(?<=[\s.·]))((?:\(\s*\d{1,2}\s*\)|\d{1,2}[.)](?!\d)|[①-⑳]|-(?=\s))\s*)/g;
export function splitParts(tRaw) {
  const t = norm(tRaw);
  /* `실온/ 1)… 2)…` 처럼 `/` 로 갈라 쓰는 표기가 흔하다. `/` 는 조각 경계로 보되
     원문대로 다시 이어 붙인다. 괄호 안의 `/`(단위 표기)는 자르지 않는다. */
  const chunks = [];
  let depth = 0, buf = '';
  for (const ch of t) {
    if (ch === '(' || ch === '（') depth++;
    else if (ch === ')' || ch === '）') depth = Math.max(0, depth - 1);
    if (ch === '/' && depth === 0) { chunks.push(buf); buf = ''; continue; }
    buf += ch;
  }
  chunks.push(buf);
  const flat = [];
  chunks.forEach((chunk, ci) => {
    if (ci) flat.push({ marker: '/', text: '' });
    const c = norm(chunk);
    if (!c) return;
    const out = [];
    let last = 0, marker = '';
    for (const m of c.matchAll(MARKER)) {
      const text = c.slice(last, m.index);
      if (text.trim() || marker) out.push({ marker, text: norm(text) });
      marker = norm(m[1]); last = m.index + m[1].length;
    }
    out.push({ marker, text: norm(c.slice(last)) });
    for (const seg of out) {
      if (!seg.text) { if (seg.marker) flat.push(seg); continue; }
      /* `보관하십시오.제품 개봉 후에는…` 처럼 마침표 뒤에 공백이 없는 표기가 흔하다.
         소수점을 자르지 않도록 **한글 뒤의 마침표**에서만 나눈다. */
      const sents = seg.text.split(/(?<=[가-힣][.。])\s*/).map(norm).filter(Boolean);
      sents.forEach((s, i) => flat.push({ marker: i === 0 ? seg.marker : '', text: s }));
    }
  });
  return flat.filter((s) => s.text || s.marker);
}

export function sentenceCompose(tRaw) {
  const parts = splitParts(tRaw);
  /* 조각이 하나라도 번호가 붙어 있으면 분해한 보람이 있다 — `(1) 제품은 …` */
  if (parts.length < 2 && !(parts.length === 1 && parts[0].marker)) return null;
  const out = [];
  for (const p of parts) {
    if (!p.text) { out.push(p.marker); continue; }
    if (!HANGUL.test(p.text)) { out.push((p.marker ? p.marker + ' ' : '') + p.text); continue; }
    const k = p.text, bare = k.replace(/[.]$/, '');
    const hit = DICT.get(k) ?? DICT.get(bare) ?? DICT.get(bare + '.');
    if (!hit) return null;
    const en = /[.]$/.test(hit) ? hit : (/[.]$/.test(k) ? hit + '.' : hit);
    out.push((p.marker ? p.marker + ' ' : '') + en);
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}
const unitTime = (n, u) => (u === '년' ? (n === '1' ? 'year' : 'years') : 'months');

/** 규격 라인 앞머리(`차전자피 식이섬유로서 `). 비어 있으면 '' , 못 읽으면 null. */
function specLead(leadRaw) {
  const t = norm(leadRaw);
  if (!t) return '';
  const m = /^(.+?)(?:으로서|로서)$/.exec(t);
  if (m) { const e = HEAD.get(norm(m[1])) ?? DICT.get(norm(m[1])); return e ? `as ${e}, ` : null; }
  const e = HEAD.get(t) ?? DICT.get(t);
  return e ? `${e} ` : null;
}

/* ── 머리 번역 ────────────────────────────────────────────────── */
/**
 * 머리 용어의 표기 변형을 하나로 접는다.
 * `성 상` `세 균 수` `총 플라보노이드` 처럼 **공백만 다른 표기**가 매우 흔하므로
 * 사전 조회는 공백을 모두 지운 열쇠로 한다. 사전도 같은 열쇠로 적재한다.
 */
export const hkey = (s) => norm(s).replace(/\s+/g, '').replace(/[․·]/g, '·');
const HEADK = new Map();
export function reindexHeads() {
  HEADK.clear();
  /* 순서가 중요하다 — 일반 문구 사전을 먼저 깔고 **머리 사전이 이긴다**.
     반대로 두면 저작·수확한 항목명이 잡다한 문구 사전에 덮인다. */
  for (const [ko, en] of DICT) if (ko.length <= 40) HEADK.set(hkey(ko), en);
  for (const [ko, en] of HEAD) HEADK.set(hkey(ko), en);
}
reindexHeads();

/** 진세노사이드 합 표기는 순서·공백·연결어가 제각각이라 코드 집합으로 읽는다. */
function ginsenoside(t) {
  if (!/^진세노사이드/.test(hkey(t))) return null;
  /* 꼬리 괄호(단위)는 버리지 않고 그대로 붙인다 — `…의 합(mg/1200 mg)` */
  let tail = '';
  const pm = /^(.*?)\s*[(（]\s*([^)）]*)\s*[)）]\s*$/.exec(t);
  let core = t;
  if (pm && !HANGUL.test(pm[2]) && !/^R[a-z]\d/i.test(pm[2])) { core = pm[1]; tail = ` (${U(pm[2])})`; }
  const codes = [...core.matchAll(/R[a-z]\d(?:\(\w+\))?/gi)].map((m) => m[0]);
  if (!codes.length) return null;
  /* 코드 뒤에 남은 한글이 `합/합계/으로/로서` 말고 더 있으면 문장이다 — 머리로 다루지 않는다. */
  const leftover = core.replace(/^진세노사이드/, '').replace(/R[a-z]\d(?:\(\w+\))?/gi, '')
    .replace(/[,+\s()·]|및|과|와|의|합계|합|으로서|으로|로서|로/g, '');
  if (leftover) return null;
  if (!/합|합계/.test(core) && codes.length === 1) return `Ginsenoside ${codes[0]}${tail}`;
  const last = codes.pop();
  return `Sum of ginsenosides ${codes.length ? codes.join(', ') + ' and ' : ''}${last}${tail}`;
}

/** `납(mg/kg)` → `Lead (mg/kg)`. 단위·백분율 괄호를 떼어 기본어만 조회한다. */
export function translateHead(headRaw) {
  const t = norm(headRaw);
  if (!t) return null;
  const k = hkey(t);
  const direct = HEADK.get(k);
  if (direct) return direct;
  const gs = ginsenoside(t);
  if (gs) return gs;
  /* 단위/백분율 괄호 — `아연(%)` `납(mg/kg)` `카드뮴(㎎/㎏)` */
  let m = /^(.+?)\s*[(（]\s*([^)）]*)\s*[)）]$/.exec(t);
  if (m && !HANGUL.test(m[2]) && m[2].trim()) {
    const base = translateHead(m[1]);
    if (base) return `${base} (${U(m[2])})`;
  }
  /* `총 X` → `Total x` */
  m = /^총\s*(.+)$/.exec(t);
  if (m) { const inner = translateHead(m[1]); if (inner) return `Total ${inner.charAt(0).toLowerCase() + inner.slice(1)}`; }
  /* `X 함량` → `X content` */
  m = /^(.+?)\s*함량$/.exec(t);
  if (m) { const inner = translateHead(m[1]); if (inner) return `${inner} content`; }
  /* `X 수` / `X수` → `X count` */
  m = /^(.+?)\s*수$/.exec(t);
  if (m) { const inner = translateHead(m[1]); if (inner) return `${inner} count`; }
  /* `세균수(1ml당)` — 괄호 안이 한글 단위 표현인 경우 */
  m = /^(.+?)\s*[(（]\s*(?:1\s*)?(mL|ml|㎖|g|㎏|kg|L)\s*당?\s*[)）]$/i.exec(t);
  if (m) { const base = translateHead(m[1]); if (base) return `${base} (per ${U(m[2])})`; }
  /* `X(Y으로서)` → `X (as y)` */
  m = /^(.+?)\s*[(（]\s*(.+?)\s*으?로서\s*[)）]$/.exec(t);
  if (m) { const base = translateHead(m[1]), as = translateHead(m[2]) ?? (HANGUL.test(m[2]) ? null : m[2]); if (base && as) return `${base} (as ${as.charAt(0).toLowerCase() + as.slice(1)})`; }
  /* `X 중 Y` → `Y in x` */
  m = /^(.+?)\s*중\s*(.+)$/.exec(t);
  if (m) { const a = translateHead(m[1]), b = translateHead(m[2]); if (a && b) return `${b} in ${a.charAt(0).toLowerCase() + a.slice(1)}`; }
  /* `A와 B의 합` → `Sum of A and B` */
  m = /^(.+?)\s*(?:와|과|\+|&amp;|&)\s*(.+?)의?\s*합(?:계)?$/.exec(t);
  if (m) { const a = translateHead(m[1]), b = translateHead(m[2]); if (a && b) return `Sum of ${a.charAt(0).toLowerCase() + a.slice(1)} and ${b.charAt(0).toLowerCase() + b.slice(1)}`; }
  /* `A, B, C` 나열 — 천 단위 구분자는 제외한다 */
  if (/,/.test(t) && !/\d\s*,\s*\d/.test(t)) {
    const parts = t.split(/\s*,\s*/).map(norm).filter((x) => x.length > 1);
    if (parts.length >= 2) { const en = parts.map((x) => translateHead(x)); if (en.every(Boolean)) return en.join(', '); }
  }
  /* `X(Y)` — 괄호 안이 라틴 학명/약어이고 기본어를 모르는 경우 그 표기를 쓴다 */
  m = /^(.+?)\s*[(（]\s*([^)）]*[A-Za-z][^)）]*)\s*[)）]$/.exec(t);
  /* 약어(`(EGCG)`)는 그것만 남기면 항목이 무엇인지 알 수 없다. **소문자 낱말**이 있는
     학명·정식명일 때만 쓴다. */
  if (m && !HANGUL.test(m[2]) && /[a-z]{3}/.test(m[2])) {
    const inner = norm(m[2]);
    return inner.charAt(0).toUpperCase() + inner.slice(1);
  }
  return null;
}

/* ── 슬롯 전체 번역 ───────────────────────────────────────────── */
/**
 * 번호 표기의 한글 순서문자를 라틴 순서문자로 바꾼다 — `(가)`→`(a)`.
 * 가나다 순서와 abc 순서는 같은 열거이므로 대응이 결정적이다. 숫자·기호는 그대로 둔다.
 */
const HANGUL_ORDINAL = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
export function translateLead(lead) {
  if (!HANGUL.test(lead)) return lead;
  let out = lead;
  for (let i = 0; i < HANGUL_ORDINAL.length; i++) {
    out = out.split(HANGUL_ORDINAL[i]).join(String.fromCharCode(97 + i));
  }
  return HANGUL.test(out) ? null : out;
}

export function translateSlot(inner) {
  const p = splitSlot(inner);
  if (HANGUL.test(p.lead)) {
    const l = translateLead(p.lead);
    if (l === null) return { ok: false, why: 'LEAD_UNKNOWN', ko: norm(p.lead) };
    p.lead = l;
  }
  let head = p.head, body = p.body;
  if (HANGUL.test(head)) {
    const h = translateHead(head);
    if (!h) return { ok: false, why: 'HEAD_UNKNOWN', ko: norm(head) };
    head = h;
  }
  if (HANGUL.test(body)) {
    const b = translateBody(body);
    if (b === null) return { ok: false, why: 'BODY_UNKNOWN', ko: norm(body), shape: bodyShape(body) };
    body = b;
  }
  const out = joinSlot(p, head, body);
  if (HANGUL.test(out)) return { ok: false, why: 'RESIDUE_LEFT', ko: norm(inner) };
  return { ok: true, en: out };
}
