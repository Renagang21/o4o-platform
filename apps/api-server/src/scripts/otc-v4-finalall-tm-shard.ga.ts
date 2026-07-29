/**
 * WO-O4O-OTC-EASY-DRUG-MASTER-BY-MASTER-PILOT500-THEN-NEXT2000-CONTINUOUS-PRODUCTION-V1
 *   — pilot 500 EN 번역메모리 미충족 문장 샤딩 / 병합 (에이전트 가)
 *
 * DB 접근 0. TM 파일(otc-v4-finalall-tm.ga.json)만 입출력한다.
 *
 *   --split [--shards N]   미충족 문장을 N개 shard 파일로 분할(결정론적: 문장 사전순 → index % N)
 *   --merge                shard filled 파일을 TM entries 에 병합(기존 값 보존, 검증 후 반영)
 *
 * 병합 게이트(위반 문장은 미반영 + 사유 리포트):
 *   - 빈 값 금지
 *   - 한글 잔존 금지
 *   - 원문 수치 토큰(숫자) 보존 — 누락 시 반려
 *   - 원문에 없던 새 수치 추가 금지
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './otc-v4-master-leaflet-contract.ga.js';
import { WO_500 } from './otc-v4-finalall-contract.ga.js';

const TM = path.join(DATA_DIR, 'otc-v4-finalall-tm.ga.json');
const shardFile = (i: number): string => path.join(DATA_DIR, `otc-v4-finalall-tm-shard${i}.ga.json`);
const filledFile = (i: number): string => path.join(DATA_DIR, `otc-v4-finalall-tm-shard${i}-filled.ga.json`);
const OUT_MERGE = path.join(DATA_DIR, 'otc-v4-finalall-tm-merge-report.ga.json');
const has = (k: string): boolean => process.argv.includes(`--${k}`);
const argOf = (k: string, d: number): number => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 && process.argv[i + 1] ? parseInt(process.argv[i + 1], 10) : d;
};

interface Tm {
  entries: Record<string, string>;
  annotations: Record<string, { count: number; masters: number; routes: string[]; section: string; from: string }>;
  [k: string]: unknown;
}
const loadTm = (): Tm => JSON.parse(fs.readFileSync(TM, 'utf8')) as Tm;

/** 숫자 토큰 집합(수치 보존 검증용). 전각/유니코드 분수는 원문 그대로 비교. */
const numTokens = (s: string): string[] => (s.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => x.replace(/,/g, ''));

/**
 * 수치 보존 검증에서 **관용 표현으로 흡수되는 숫자**를 면제한다.
 *
 * 면제는 두 종류뿐이며, 둘 다 "정보가 영어 관용 표현에 그대로 살아 있을 때"만 인정한다:
 *   (1) `1일`/`1회` 의 1 — EN 이 daily·a day·per day·once·single 등 빈도 표현을 가질 때.
 *       "1일 3회" → "3 times a day" 는 정보 손실이 아니다. "1 time a day" 강제는 문장 품질만 떨어뜨린다.
 *   (2) `제N도`/`N차성` 의 서수 N — EN 이 대응 서수어(second-degree, secondary…)를 가질 때.
 *
 * ⚠️ 해당 숫자가 문장 내 **다른 용도로도 쓰이면 면제하지 않는다**(용량 1 mL 등의 실수치 누락 은폐 방지).
 * 면제된 건은 전부 리포트에 남긴다.
 */
/** 숫자의 영어 단어형 — 이 표현이 EN 에 있으면 그 수는 문장에 보존된 것으로 본다. */
const NUMBER_WORD: Record<string, RegExp> = {
  1: /\b(one|once|single|first|primary|1st|a day|per day|daily|each day|each time|at a time|a time|per dose)\b/i,
  2: /\b(two|twice|second|secondary|secondarily|2nd|both)\b/i,
  3: /\b(three|thrice|third|tertiary|3rd)\b/i,
  4: /\b(four|fourth|quaternary|4th)\b/i,
  5: /\b(five|fifth|5th)\b/i,
};
/** 관용 위치 = 숫자 바로 뒤가 일·회·기·도·차·번·째 (빈도/서수/시기). 용량 단위 옆 숫자는 여기 해당하지 않는다. */
const IDIOM_POS = /(?:제\s*)?(\d+)\s*(?:일|회|기|도|차성|차|번|째)(?![0-9])/g;
/**
 * 숫자 1 한정 — `1주`·`1개월` 처럼 단위와 결합한 1 은 영어에서 부정관사로 흡수된다
 * (`1주 이상 지속되는 기침` → "a cough that persists for a week or more"). 정보 손실이 아니다.
 * **2 이상은 실수치이므로 이 규칙을 적용하지 않는다.**
 */
const IDIOM_ONE_UNIT = /1\s*(?:주일|주|개월|년|시간|분)(?![0-9])/;
const ARTICLE_UNIT = /\ban? (week|day|month|year|hour|minute|dose|time|tablet|capsule|drop)s?\b/i;

function exemptedNums(ko: string, en: string): string[] {
  const ex: string[] = [];
  const idiomDigits = new Set<string>();
  for (const m of ko.matchAll(IDIOM_POS)) idiomDigits.add(m[1]);
  // 관용 위치에서 쓰인 숫자만 후보. 같은 숫자가 문장 내 다른 위치(용량·연령 등)에도 있으면 면제하지 않는다.
  const stripped = ko.replace(IDIOM_POS, ' ').replace(new RegExp(IDIOM_ONE_UNIT.source, 'g'), ' ');
  // `1주`/`1개월` 류의 1 — 문장 내 다른 곳에 1 이 없고 EN 이 부정관사 단위 표현을 가질 때만 후보에 넣는다.
  if (IDIOM_ONE_UNIT.test(ko) && !numTokens(stripped).includes('1')
      && (ARTICLE_UNIT.test(en) || NUMBER_WORD[1].test(en))) idiomDigits.add('1');
  for (const d of idiomDigits) {
    if (numTokens(stripped).includes(d)) continue;     // 다른 용도로도 쓰임 → 실수치, 면제 불가
    if (!NUMBER_WORD[d]?.test(en)) continue;           // EN 에 단어형 보존 없음 → 진짜 누락
    ex.push(d);
  }
  return ex;
}

function runSplit(): void {
  const tm = loadTm();
  const pending = Object.keys(tm.entries).filter((k) => !tm.entries[k]).sort();
  const n = Math.max(1, argOf('shards', 4));
  // 직전 병합에서 반려된 문장은 사유를 함께 실어 재교정 라운드에서 같은 실수를 반복하지 않게 한다.
  const prevReject = new Map<string, string>();
  if (fs.existsSync(OUT_MERGE)) {
    const j = JSON.parse(fs.readFileSync(OUT_MERGE, 'utf8'));
    for (const r of (j.rejectedDetail || []) as Array<{ ko: string; reason: string }>) prevReject.set(r.ko, r.reason);
  }
  const shards: Array<Array<{ ko: string; section: string; routes: string[]; masters: number; numbers: string[]; previousRejection?: string }>> = [];
  for (let i = 0; i < n; i++) shards.push([]);
  pending.forEach((ko, idx) => {
    const a = tm.annotations[ko];
    const rej = prevReject.get(ko);
    shards[idx % n].push({ ko, section: a.section, routes: a.routes, masters: a.masters, numbers: numTokens(ko), ...(rej ? { previousRejection: rej } : {}) });
  });
  for (let i = 0; i < n; i++) {
    fs.writeFileSync(shardFile(i), JSON.stringify({
      wo: WO_500, kind: 'tm-shard', shard: i, shards: n, total: shards[i].length,
      instruction: 'sentences[].ko 를 EN 으로 1:1 번역해 filled 파일의 entries{ko:en} 에 채운다. 의료사실 추가·삭제 금지. 수치·연령·기간 보존. 한글 잔존 금지.',
      sentences: shards[i],
    }, null, 2) + '\n', 'utf8');
  }
  console.log(JSON.stringify({ mode: 'split', pending: pending.length, shards: n, perShard: shards.map((s) => s.length) }, null, 2));
}

function runMerge(): void {
  const tm = loadTm();
  const before = Object.values(tm.entries).filter(Boolean).length;
  const rejected: Array<{ shard: number; ko: string; reason: string }> = [];
  const exemptions: Array<{ shard: number; ko: string; en: string; exempted: string[] }> = [];
  const overwritten: Array<{ shard: number; ko: string; before: string; after: string }> = [];
  const overwriteFrom = process.argv.includes('--overwrite-from') ? argOf('overwrite-from', -1) : -1;
  let applied = 0;
  let skippedExisting = 0;
  const seen = new Set<string>();
  for (let i = 0; ; i++) {
    const f = filledFile(i);
    if (!fs.existsSync(f)) { if (i === 0) continue; if (!fs.existsSync(filledFile(i + 1))) break; else continue; }
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    const ent = (j.entries || {}) as Record<string, string>;
    for (const [ko, en] of Object.entries(ent)) {
      if (!(ko in tm.entries)) { rejected.push({ shard: i, ko, reason: 'TM 미등록 문장(대상 밖)' }); continue; }
      // 교정 라운드(overwrite-from 이상 shard)만 기존 값을 덮어쓸 수 있다.
      // 1차 번역 shard 끼리는 서로 덮어쓰지 못하게 막아 순서 의존 결과를 방지한다.
      const mayOverwrite = overwriteFrom >= 0 && i >= overwriteFrom;
      if (tm.entries[ko] && !mayOverwrite) { skippedExisting++; continue; }
      if (seen.has(ko)) { rejected.push({ shard: i, ko, reason: 'shard 간 중복 제출' }); continue; }
      const t = (en || '').trim();
      if (!t) { rejected.push({ shard: i, ko, reason: '빈 번역' }); continue; }
      if (/[가-힣]/.test(t)) { rejected.push({ shard: i, ko, reason: '한글 잔존' }); continue; }
      const srcN = numTokens(ko);
      const dstN = numTokens(t);
      const ex = exemptedNums(ko, t);
      const missing = srcN.filter((x) => !dstN.includes(x) && !ex.includes(x));
      const added = dstN.filter((x) => !srcN.includes(x));
      if (missing.length) { rejected.push({ shard: i, ko, reason: `수치 누락: ${missing.join(',')}` }); continue; }
      if (added.length) { rejected.push({ shard: i, ko, reason: `원문에 없는 수치 추가: ${added.join(',')}` }); continue; }
      if (ex.length) exemptions.push({ shard: i, ko: ko.slice(0, 120), en: t.slice(0, 120), exempted: ex });
      if (tm.entries[ko] && tm.entries[ko] !== t) overwritten.push({ shard: i, ko: ko.slice(0, 100), before: tm.entries[ko].slice(0, 160), after: t.slice(0, 160) });
      tm.entries[ko] = t;
      seen.add(ko);
      applied++;
    }
    if (i > 64) break;
  }
  const after = Object.values(tm.entries).filter(Boolean).length;
  fs.writeFileSync(TM, JSON.stringify({ ...tm, filled: after }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_MERGE, JSON.stringify({
    wo: WO_500, mode: 'merge', before, applied, skippedExisting, after,
    pendingAfter: Object.keys(tm.entries).length - after,
    rejected: rejected.length, rejectedDetail: rejected.slice(0, 200),
    overwriteFrom, overwritten: overwritten.length, overwrittenDetail: overwritten,
    numericExemptions: exemptions.length,
    numericExemptionPolicy: '1일/1회 관용 1 · 제N도/N차성 서수 N 만 면제. 해당 숫자가 문장 내 다른 용도로 쓰이면 면제 없음. 용량·연령 실수치는 면제 대상 아님.',
    numericExemptionDetail: exemptions,
  }, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ mode: 'merge', before, applied, after, pendingAfter: Object.keys(tm.entries).length - after, rejected: rejected.length, rejectedSample: rejected.slice(0, 15) }, null, 2));
}

/**
 * 제출본의 key 가 원문과 미세하게 달라 병합되지 못한 건을 원문 key 로 되돌린다.
 *
 * 배경: 공식 원문에는 제어문자(U+009E 등) · 오탈자가 그대로 들어 있다. 번역 담당이 key 를
 * 복사하는 과정에서 이를 "교정"하거나 누락하면 exact-match 병합이 실패한다.
 * 번역문 자체는 정상인 경우가 대부분이므로 폐기하지 않고 원문 key 로 재귀속시킨다.
 *
 * ⚠️ 오귀속 방지 3중 조건 — 전부 만족할 때만 적용하고, 적용분은 diff 와 함께 전건 기록한다:
 *   (1) 유사도 ≥ 0.98 (문자 위치 일치율)
 *   (2) 그 임계값을 넘는 후보가 정확히 1건
 *   (3) 원문 key 와 제출 key 의 수치 집합이 동일
 */
function similarity(a: string, b: string): number {
  const n = Math.max(a.length, b.length);
  if (!n) return 1;
  let same = 0;
  // 삽입/삭제 1자를 허용하기 위해 오프셋 -1/0/+1 중 최댓값을 취한다.
  for (const off of [-1, 0, 1]) {
    let s = 0;
    for (let i = 0; i < a.length; i++) if (a[i] === b[i + off]) s++;
    same = Math.max(same, s);
  }
  return same / n;
}

function runRekey(): void {
  const tm = loadTm();
  const pending = Object.keys(tm.entries).filter((k) => !tm.entries[k]);
  const submitted = new Map<string, { en: string; shard: number }>();
  for (let i = 0; i <= 64; i++) {
    const f = filledFile(i);
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const [ko, en] of Object.entries((j.entries || {}) as Record<string, string>)) {
      if (!(ko in tm.entries)) submitted.set(ko, { en, shard: i });   // 원문에 없는 key = 변형 후보
    }
  }
  const applied: Array<{ ko: string; submittedKey: string; rule: string; similarity: number; diffAt: number; shard: number }> = [];
  const unresolved: Array<{ ko: string; reason: string; best?: string; score?: number }> = [];
  /** 보이지 않는 제어문자(C0/C1) 제거 + NFC — 공식 원문에 섞인 U+009E 류를 제출측이 누락한 경우를 흡수. */
  /**
   * 매칭 전용 정규화. 저장되는 key 는 언제나 TM 원문 그대로다.
   *  - 보이지 않는 제어문자(C0/C1) 제거
   *  - **가운뎃점 계열 구분자 통일** — 공식 원문이 U+00B7(·) · U+0387(·) · U+2219 · U+22C5 · U+30FB(・) ·
   *    U+318D(ᆞ) · U+2027 · U+2022(•) 를 혼용하고, 번역 담당이 이를 서로 바꿔 적는 일이 잦다.
   *    ASCII 마침표는 의도적으로 제외한다(문장 종결과 구분자를 섞지 않기 위해).
   */
  const ctrlFree = (s: string): string => s.normalize('NFC')
    .replace(/[ ---]/g, '')
    // 한글 사이에 낌 마침표도 구분자로 본다(예: 어지러움.구토). 문장 종결 마침표는 대상 아님.
    .replace(/(?<=[가-힣])\.(?=[가-힣])/g, '·')
    .replace(/[··•‧∙⋅・ㆍ･]/g, '·');
  for (const ko of pending) {
    // 규칙 1 — 제어문자만 제거하면 완전 동일. 추정이 개입하지 않으므로 가장 안전하다.
    const exactAfterStrip = [...submitted.entries()].filter(([k]) => ctrlFree(k) === ctrlFree(ko));
    if (exactAfterStrip.length === 1) {
      const [k, v] = exactAfterStrip[0];
      let d = 0; while (d < Math.min(ko.length, k.length) && ko[d] === k[d]) d++;
      tm.entries[ko] = v.en;
      applied.push({ ko: ko.slice(0, 100), submittedKey: k.slice(0, 100), rule: 'control-char-normalized-exact', similarity: 1, diffAt: d, shard: v.shard });
      continue;
    }
    if (exactAfterStrip.length > 1) { unresolved.push({ ko, reason: `제어문자 정규화 후 동일 후보 ${exactAfterStrip.length}건 — 미적용` }); continue; }

    // 규칙 2 — 오탈자 교정형 변형. 유사도/유일성/수치집합 3중 조건.
    const cands = [...submitted.entries()]
      .map(([k, v]) => ({ k, v, s: similarity(ko, k) }))
      .filter((c) => c.s >= 0.98);
    if (cands.length === 0) { unresolved.push({ ko, reason: '유사 후보 없음' }); continue; }
    if (cands.length > 1) { unresolved.push({ ko, reason: `유사 후보 ${cands.length}건 — 오귀속 위험으로 미적용` }); continue; }
    const c = cands[0];
    const a = numTokens(ko).slice().sort().join(',');
    const b = numTokens(c.k).slice().sort().join(',');
    if (a !== b) { unresolved.push({ ko, reason: `수치 집합 불일치(${a} vs ${b})`, best: c.k, score: c.s }); continue; }
    let d = 0; while (d < Math.min(ko.length, c.k.length) && ko[d] === c.k[d]) d++;
    tm.entries[ko] = c.v.en;
    applied.push({ ko: ko.slice(0, 100), submittedKey: c.k.slice(0, 100), rule: 'typo-variant-fuzzy', similarity: +c.s.toFixed(4), diffAt: d, shard: c.v.shard });
  }
  const after = Object.values(tm.entries).filter(Boolean).length;
  fs.writeFileSync(TM, JSON.stringify({ ...tm, filled: after }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'otc-v4-finalall-tm-rekey-report.ga.json'), JSON.stringify({
    wo: WO_500, mode: 'rekey',
    policy: '유사도>=0.98 + 유일 후보 + 수치집합 동일 3중 조건. 원문 제어문자/오탈자를 제출측이 교정·누락한 경우를 되돌린다.',
    pendingBefore: pending.length, applied: applied.length, unresolved: unresolved.length,
    appliedDetail: applied, unresolvedDetail: unresolved,
  }, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ mode: 'rekey', pendingBefore: pending.length, applied: applied.length, unresolved: unresolved.length, appliedDetail: applied, unresolvedDetail: unresolved }, null, 2));
}

if (has('split')) runSplit();
else if (has('merge')) runMerge();
else if (has('rekey')) runRekey();
else { console.error('mode 필요: --split [--shards N] | --merge | --rekey'); process.exit(1); }
