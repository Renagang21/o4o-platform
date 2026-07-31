/**
 * WO-O4O-OTC-STORE-EN-CANONICAL-BULK-AUDIT-TRANSLATE-APPLY-BATCH-5000-V1
 *   — 일반의약품 KO STORE canonical 기준 **EN 전수 점검 배치 1** (READ-ONLY · DB write 0)
 *
 * 모집단(§4) — 코드가 아니라 LIVE 에서 산출한다:
 *   deleted_at IS NULL · description_type='STORE' · status='canonical' · language=ko
 *   · source_type ∈ 저작 leaflet 3종 · ProductMaster 연결 유효 · master 당 canonical 1건
 *   `mfds_easy_drug` 는 **저작 설명서가 아니라 공식 원문 문서**이므로 모집단에서 제외한다
 *   (실측: 353건 전부 sd-card 0 · `<p><strong>` 원문 구조 100% · 대응 EN 0).
 *
 * 배치: 고정 정렬(master_id, ko description_id) 상위 5,000. manifest 는 불변 원장으로 저장한다.
 *
 * 판정(§5, 상호배타):
 *   PASS_EXISTING / TRANSLATED_MISSING / RETRANSLATED_INVALID / REVIEW_REQUIRED
 *
 * 판정 철학(§6): **단순 키워드 검출로 오역을 확정하지 않는다.**
 *   RETRANSLATED_INVALID 는 해석 여지가 없는 객관적 결함에만 부여한다
 *   (한글 잔존 · 필수 구조 결손 · 번역 실패 마커 · HTML 붕괴 · 비정상 반복 · 정보 전량 소실).
 *   의미 판단이 필요한 모든 신호는 REVIEW_REQUIRED 로 분리하고 본문을 건드리지 않는다.
 *   번역 지침 T-07 이 문장 분할·결합·어순 조정을 허용하므로 문장 수 대응은 결함 근거가 아니다.
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-store-en-bulk-audit.ga.ts [--port 5542] [--batch-size 5000]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';

const WO = 'WO-O4O-OTC-STORE-EN-CANONICAL-BULK-AUDIT-TRANSLATE-APPLY-BATCH-5000-V1';
const BATCH_ID = 'otc-en-audit-batch-01';
const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const md5 = (s: string): string => createHash('md5').update(s, 'utf8').digest('hex');

const AUTHORED = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'o4o_drug_otc_topical'];

/* ── 텍스트 유틸 ─────────────────────────────────────────────────────────────── */
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const text = (html: string): string => unesc(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const liTexts = (html: string): string[] =>
  (html.match(/<li>([\s\S]*?)<\/li>/g) || []).map((x) => text(x));
/**
 * **본문 영역만** 추출한다(제품명·hero 타이틀·meta·badge 제외).
 * EN 은 지침상 제품명을 일반 표기로 대체하므로("리도킨연고5%" → "Topical medicine (MFDS …)"),
 * 제품명 속 수치까지 대조하면 오탐이 된다(실측 표본에서 확인).
 */
function bodyText(html: string): string {
  const parts: string[] = [];
  const intro = html.match(/<p class="sd-intro">([\s\S]*?)<\/p>/); if (intro) parts.push(intro[1]);
  const intake = html.match(/<p class="sd-intake">([\s\S]*?)<\/p>/); if (intake) parts.push(intake[1]);
  for (const ul of html.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || []) parts.push(ul);
  for (const item of html.match(/<div class="sd-item">[\s\S]*?<\/div>/g) || []) parts.push(item);
  const foot = html.match(/<p class="sd-foot">([\s\S]*?)<\/p>/); if (foot) parts.push(foot[1]);
  return text(parts.join(' '));
}
const cnt = (h: string, re: RegExp): number => (h.match(re) || []).length;

/** 영어 수사 → 숫자 (지침 T-02 는 값 보존을 요구하되 표기 변환은 허용한다) */
const WORD_NUM: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8',
  nine: '9', ten: '10', eleven: '11', twelve: '12', half: '0.5',
};
/**
 * KO 쪽에서 **단위가 붙은 수치**만 뽑는다.
 * 단위 없는 숫자(품목기준코드 9자리·연도 등)까지 대조하면 전 문서가 오탐이 된다(실측: 4,552/5,000).
 */
const KO_UNIT = /(\d+(?:[.,]\d+)?)\s*(mg|밀리그램|㎎|㎍|mcg|g|그램|mL|밀리리터|㎖|L|리터|%|IU|세|개월|회|일|주|시간|분|정|캡슐|포|매|방울|스푼|밀리|배)/g;
/** 용량·농도 단위 — 값이 사라지면 정보 손실이다 */
const DOSE_UNIT = /^(mg|밀리그램|㎎|㎍|mcg|g|그램|mL|밀리리터|㎖|L|리터|%|IU)$/;
/**
 * 빈도·수량 단위의 `1`·`2` 는 영어에서 수사로 남지 않는다("1일 3회"→"three times **a day**", "2회"→"**twice**").
 * 이를 손실로 세면 전 문서가 오탐이 된다(실측: 손실값 상위 = 1(467)·2(344)).
 */
function koNumbers(s: string): Array<{ v: string; u: string }> {
  const out: Array<{ v: string; u: string }> = [];
  let m: RegExpExecArray | null;
  KO_UNIT.lastIndex = 0;
  while ((m = KO_UNIT.exec(s))) out.push({ v: m[1].replace(/,/g, ''), u: m[2] });
  return out;
}
/** EN 본문에 실제로 존재하는 수치 집합(영어 수사·서수 포함) */
function enNumberSet(s: string): Set<string> {
  const norm = s.replace(/,/g, '').toLowerCase()
    .replace(/\bonce\b/g, ' 1 ').replace(/\btwice\b/g, ' 2 ').replace(/\bthrice\b/g, ' 3 ')
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half)\b/g, (w) => WORD_NUM[w]);
  return new Set((norm.match(/\d+(?:\.\d+)?/g) || []));
}
const multisetDiff = (a: string[], b: string[]): { onlyA: string[]; onlyB: string[] } => {
  const ca = new Map<string, number>(), cb = new Map<string, number>();
  for (const x of a) ca.set(x, (ca.get(x) || 0) + 1);
  for (const x of b) cb.set(x, (cb.get(x) || 0) + 1);
  const onlyA: string[] = [], onlyB: string[] = [];
  for (const [k, n] of ca) { const d = n - (cb.get(k) || 0); for (let i = 0; i < d; i++) onlyA.push(k); }
  for (const [k, n] of cb) { const d = n - (ca.get(k) || 0); for (let i = 0; i < d; i++) onlyB.push(k); }
  return { onlyA, onlyB };
};

/* ── 결함 코드 ───────────────────────────────────────────────────────────────── */
/** 해석 여지 없이 확정되는 결함 → RETRANSLATED_INVALID */
const HARD = new Set([
  'EN_EMPTY_OR_TOO_SHORT', 'HANGUL_IN_EN', 'REQUIRED_SECTION_MISSING', 'TRANSLATION_FAILURE_MARKER',
  'HTML_STRUCTURE_BROKEN', 'FORBIDDEN_TABLE_OR_COMMENT', 'ABNORMAL_REPETITION',
  'ALL_NUMERIC_INFO_LOST', 'WARN_LIST_LOST', 'FIXED_LENGTH_TRUNCATION',
]);

type Row = {
  koId: string; enId: string | null; masterId: string; productName: string | null; sourceType: string;
  koSourceRef: string | null; enSourceRef: string | null; koContent: string; enContent: string | null;
  koSummary: string | null; enSummary: string | null; regulatoryType: string | null; drugCategory: string | null;
};

function auditPair(r: Row): { defects: string[]; soft: string[]; detail: Record<string, unknown> } {
  const defects: string[] = [], soft: string[] = [];
  const detail: Record<string, unknown> = {};
  const ko = r.koContent, en = r.enContent as string;

  /* 1. 본문 존재 */
  if (!en || en.trim().length < 200) { defects.push('EN_EMPTY_OR_TOO_SHORT'); return { defects, soft, detail }; }

  /* 2. 한글 잔존 — 저작 EN 에 한글은 존재할 수 없다 */
  const hangul = en.match(/[가-힣]+/g) || [];
  if (hangul.length) { defects.push('HANGUL_IN_EN'); detail.hangulSample = hangul.slice(0, 5); }

  /* 3. 필수 구조 — KO 에 있는 구조가 EN 에서 사라지면 결손이다(신설 요구가 아니다) */
  const missing: string[] = [];
  for (const m of ['sd-card', 'sd-hero', 'sd-body', 'sd-intro', 'sd-core']) {
    if (ko.includes(m) && !en.includes(m)) missing.push(m);
  }
  if (cnt(ko, /<h2>/g) > 0 && cnt(en, /<h2>/g) === 0) missing.push('h2');
  if (missing.length) { defects.push('REQUIRED_SECTION_MISSING'); detail.missingMarkers = missing; }
  const koLi = liTexts(ko), enLi = liTexts(en);
  if (koLi.length > 0 && enLi.length === 0) { defects.push('WARN_LIST_LOST'); detail.koLi = koLi.length; }

  /* 4. 번역 실패 마커 */
  const marker = en.match(/\b(TODO|FIXME|untranslated|Translation failed|\[object Object\]|undefined|null null|lorem ipsum)\b|\{\{|\}\}/i);
  if (marker) { defects.push('TRANSLATION_FAILURE_MARKER'); detail.marker = marker[0]; }

  /* 5. 금지 구조 */
  if (/<table[\s>]/i.test(en) || /<!--/.test(en)) defects.push('FORBIDDEN_TABLE_OR_COMMENT');

  /* 6. HTML 균형 */
  const pairs: Array<[RegExp, RegExp, string]> = [
    [/<div[\s>]/g, /<\/div>/g, 'div'], [/<ul[\s>]/g, /<\/ul>/g, 'ul'],
    [/<li>/g, /<\/li>/g, 'li'], [/<p[\s>]/g, /<\/p>/g, 'p'], [/<h2>/g, /<\/h2>/g, 'h2'],
  ];
  const unbalanced = pairs.filter(([o, c]) => cnt(en, o) !== cnt(en, c)).map(([, , n]) => n);
  if (unbalanced.length) { defects.push('HTML_STRUCTURE_BROKEN'); detail.unbalanced = unbalanced; }

  /* 7. 비정상 반복 — 동일 <li> 가 3회 이상 또는 인접 중복 */
  const seen = new Map<string, number>();
  for (const t of enLi) if (t) seen.set(t, (seen.get(t) || 0) + 1);
  const rep = [...seen.entries()].filter(([t, n]) => n >= 3 && t.length > 20);
  const adjacentDup = enLi.some((t, i) => i > 0 && t && t === enLi[i - 1]);
  if (rep.length || adjacentDup) { defects.push('ABNORMAL_REPETITION'); detail.repeated = rep.slice(0, 2).map(([t, n]) => ({ n, t: t.slice(0, 60) })); }

  /* 8. 고정 길이 절단 — 실측된 절단 서명(120·260)에서 종결부호 없이 끊긴 단위 */
  const KO_TERM = /[.!?][)\]"'”’]?$/;
  const cutUnits = [...enLi, text(en.match(/<p class="sd-intake">([\s\S]*?)<\/p>/)?.[1] ?? '')]
    .filter((t) => t && (t.length === 120 || t.length === 260 || t.length === 259) && !KO_TERM.test(t.trimEnd()));
  if (cutUnits.length) { defects.push('FIXED_LENGTH_TRUNCATION'); detail.cutLens = cutUnits.map((t) => t.length); }

  /* 9. 수치 보존 — 단위가 붙은 KO 수치가 EN 에서 사라졌는지만 본다(표기 변환 three→3 허용) */
  const koT = text(ko), enT = text(en);
  const koBody = bodyText(ko), enBody = bodyText(en);
  const koNums = koNumbers(koBody), enSet = enNumberSet(enBody);
  const present = (v: string): boolean => enSet.has(v) || enSet.has(String(parseFloat(v)));
  const lost = koNums.filter((n) => !present(n.v)
    /* 빈도·수량 단위의 1·2 는 영어에서 관사·twice 로 흡수되므로 손실이 아니다 */
    && !(!DOSE_UNIT.test(n.u) && (n.v === '1' || n.v === '2')));
  const lostNums = [...new Set(lost.map((n) => `${n.v}${n.u}`))];
  detail.koUnitNumCount = koNums.length; detail.lostNums = lostNums.slice(0, 12);
  detail.lostDoseNums = [...new Set(lost.filter((n) => DOSE_UNIT.test(n.u)).map((n) => `${n.v}${n.u}`))];
  if (koNums.length >= 3 && enSet.size === 0) defects.push('ALL_NUMERIC_INFO_LOST');
  else if (lostNums.length > 0) soft.push('NUMERIC_VALUE_MISSING_IN_EN');   // 의미 판단 필요 → 검토

  /* ── 이하 soft 신호: 의미 판단이 필요하므로 결함으로 확정하지 않는다 ─────────── */
  if (r.enSourceRef !== r.koSourceRef) soft.push('SOURCE_REF_MISMATCH');
  if (!r.enSourceRef) soft.push('EN_SOURCE_REF_NULL');
  /**
   * 제품 대상 경구동사 — **KO 본문에 경구 표현이 전혀 없을 때만** 신호로 본다.
   * 경구제(대다수)에서 `take it` 은 정상이므로 route 구분 없이 잡으면 전 문서가 오탐이 된다(실측 3,366/5,000).
   */
  const PRODUCT_ORAL = /\btak(?:e|es|ing)\s+(?:it|this\s+(?:medicine|drug))\b/i;
  const ORAL_MARK = /\b(by mouth|orally|internally|swallow|swallowed|eat|eaten)\b/i;
  const KO_ORAL = /(복용|먹|삼키|내복|경구)/;
  if (PRODUCT_ORAL.test(enT) && !ORAL_MARK.test(enT) && !KO_ORAL.test(koT)) soft.push('POSSIBLE_ROUTE_VERB_ISSUE');
  /**
   * 안전 상한 문장 소실 — KO 가 **일일 최대 용량을 수치로** 못 박았는데 EN 에 어떤 형태의 수치 상한도 없는 경우.
   * 표기 변환(4,000 mg→4 g)·문장 재구성은 허용되므로 세 형태를 모두 인정한 뒤에도 없을 때만 신호로 본다.
   */
  const koMaxDose = /(일일\s*)?최대\s*용량|1일\s*최대/.test(koBody) && /\d[\d,]*\s*(mg|g)\b/.test(koBody);
  if (koMaxDose) {
    const enLimit = /\d[\d,]*\s*mg\b/i.test(enBody) && /(maximum|do not exceed|no more than)/i.test(enBody);
    const enAny = /(maximum daily|daily maximum|do not exceed|no more than)\s*[^.]{0,40}\d/i.test(enBody)
      || /\b\d[\d,]*\s*(mg|g)\b[^.]{0,40}(maximum|limit|exceed)/i.test(enBody);
    if (!enLimit && !enAny) soft.push('DOSE_LIMIT_SENTENCE_MISSING');
  }
  /** KO 대비 본문이 지나치게 짧으면 정보 누락 가능 — 언어 특성상 확정 불가 → 검토 */
  const ratio = enT.length / Math.max(1, koT.length);
  detail.enKoTextRatio = +ratio.toFixed(2);
  if (ratio < 0.7) soft.push('EN_MUCH_SHORTER_THAN_KO');
  /**
   * 관측 전용(검토 사유 아님) — 번역 지침 T-07 이 문장 분할·결합을 허용하므로
   * `<li>` 수 차이와 EN summary 공란은 그 자체로 결함이 아니다(KO summary 도 설계상 NULL 이 다수).
   */
  detail.koLiCount = koLi.length; detail.enLiCount = enLi.length;
  detail.enSummaryEmpty = !r.enSummary || !String(r.enSummary).trim();

  return { defects, soft, detail };
}

async function main(): Promise<void> {
  const port = parseInt(arg('--port') || process.env.PROXY_PORT || '5542', 10);
  const batchSize = parseInt(arg('--batch-size') || '5000', 10);
  const startedAt = new Date().toISOString();
  const pool = new Pool({ host: '127.0.0.1', port, database: 'o4o_platform', max: 4, statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  /* ── 모집단 산출 ─────────────────────────────────────────────────────────── */
  const popStats = (await pool.query(
    `SELECT count(*)::int rows, count(DISTINCT s.master_id)::int masters,
            count(*) FILTER (WHERE pm.id IS NULL)::int pm_missing,
            count(*) FILTER (WHERE UPPER(COALESCE(pm.status,''))<>'ACTIVE')::int pm_not_active,
            count(*) FILTER (WHERE pm.regulatory_type<>'DRUG' OR pm.drug_category<>'otc')::int not_otc_flagged
       FROM shared_product_descriptions s LEFT JOIN product_masters pm ON pm.id=s.master_id
      WHERE s.deleted_at IS NULL AND s.description_type='STORE' AND s.status='canonical'
        AND COALESCE(s.language,'ko')='ko' AND s.source_type = ANY($1)`, [AUTHORED])).rows[0];
  const dupMasters = parseInt((await pool.query(
    `SELECT count(*)::text c FROM (SELECT master_id FROM shared_product_descriptions
       WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
         AND COALESCE(language,'ko')='ko' AND source_type = ANY($1) GROUP BY 1 HAVING count(*)>1) t`, [AUTHORED])).rows[0].c, 10);

  /* ── 배치 고정: (master_id, ko id) 안정 정렬 상위 N ───────────────────────── */
  const rows = (await pool.query(
    `SELECT k.id::text AS "koId", k.master_id::text AS "masterId", pm.name AS "productName",
            k.source_type AS "sourceType", k.source_ref_id::text AS "koSourceRef",
            k.content AS "koContent", k.summary AS "koSummary",
            pm.regulatory_type AS "regulatoryType", pm.drug_category AS "drugCategory",
            e.id::text AS "enId", e.source_ref_id::text AS "enSourceRef",
            e.content AS "enContent", e.summary AS "enSummary"
       FROM shared_product_descriptions k
       JOIN product_masters pm ON pm.id = k.master_id
       LEFT JOIN LATERAL (
         SELECT x.id, x.source_ref_id, x.content, x.summary FROM shared_product_descriptions x
          WHERE x.master_id=k.master_id AND x.source_type=k.source_type AND x.description_type='STORE'
            AND x.language='en' AND x.status='canonical' AND x.deleted_at IS NULL
          ORDER BY x.id LIMIT 1) e ON true
      WHERE k.deleted_at IS NULL AND k.description_type='STORE' AND k.status='canonical'
        AND COALESCE(k.language,'ko')='ko' AND k.source_type = ANY($1)
      ORDER BY k.master_id, k.id
      LIMIT $2`, [AUTHORED, batchSize])).rows as Row[];
  await pool.end();

  /* ── manifest(불변) ─────────────────────────────────────────────────────── */
  const manifest = {
    wo: WO, batchId: BATCH_ID, startedAt, headAtStart: process.env.HEAD_AT_START ?? null,
    populationContract: {
      conditions: "deleted_at IS NULL · description_type='STORE' · status='canonical' · language=ko · source_type ∈ authored3 · ProductMaster 연결 · master당 canonical 1",
      authoredSourceTypes: AUTHORED,
      excluded: "mfds_easy_drug(353) — 저작 설명서가 아니라 공식 원문 문서(sd-card 0 · 원문 구조 100% · 대응 EN 0)",
      sort: 'master_id, ko description_id (고정)',
    },
    populationTotal: popStats.rows, populationMasters: popStats.masters,
    duplicateCanonicalMasters: dupMasters, pmMissing: popStats.pm_missing, pmNotActive: popStats.pm_not_active,
    notOtcFlagged: popStats.not_otc_flagged,
    batchSize: rows.length, batchStart: rows[0] ? { masterId: rows[0].masterId, koId: rows[0].koId } : null,
    batchEnd: rows.length ? { masterId: rows[rows.length - 1].masterId, koId: rows[rows.length - 1].koId } : null,
    items: rows.map((r, i) => ({
      seq: i + 1, masterId: r.masterId, koId: r.koId, enId: r.enId,
      koHash: md5(r.koContent), enHash: r.enContent ? md5(r.enContent) : null,
    })),
  };
  fs.writeFileSync(P('otc-store-en-audit-batch01-manifest.ga.json'), JSON.stringify(manifest, null, 1) + '\n', 'utf8');

  /* ── 판정 ────────────────────────────────────────────────────────────────── */
  const ledger: any[] = [];
  const counters: Record<string, number> = {};
  const defectCounts: Record<string, number> = {};
  const softCounts: Record<string, number> = {};
  const bump = (m: Record<string, number>, k: string): void => { m[k] = (m[k] || 0) + 1; };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    let cls: string, reason: string, defects: string[] = [], soft: string[] = [], detail: any = {};
    if (!r.enId || !r.enContent) {
      cls = 'TRANSLATED_MISSING'; reason = 'KO canonical 에 대응하는 EN canonical 부재';
    } else {
      const a = auditPair(r); defects = a.defects; soft = a.soft; detail = a.detail;
      const hard = defects.filter((d) => HARD.has(d));
      if (hard.length) { cls = 'RETRANSLATED_INVALID'; reason = `확정 결함: ${hard.join(', ')}`; }
      else if (soft.length) { cls = 'REVIEW_REQUIRED'; reason = `자동 확정 불가 신호: ${soft.join(', ')}`; }
      else { cls = 'PASS_EXISTING'; reason = '전 검사 통과 — 변경 없음'; }
    }
    bump(counters, cls);
    for (const d of defects) bump(defectCounts, d);
    for (const s of soft) bump(softCounts, s);
    ledger.push({
      batchId: BATCH_ID, seq: i + 1, masterId: r.masterId, productName: r.productName,
      sourceType: r.sourceType, koDescriptionId: r.koId, enDescriptionId: r.enId,
      koSourceRef: r.koSourceRef, enSourceRef: r.enSourceRef,
      koHash: md5(r.koContent), enHash: r.enContent ? md5(r.enContent) : null,
      classification: cls, reason, defectCodes: defects, softSignals: soft, detail,
      translationExecuted: false, translationModel: null, translationHash: null,
      applyTarget: false, humanReview: cls === 'REVIEW_REQUIRED', blockedReason: null,
    });
  }

  const byClass = (c: string): any[] => ledger.filter((x) => x.classification === c);
  const summary = {
    wo: WO, batchId: BATCH_ID, mode: 'READ-ONLY', liveDbWrite: 0, startedAt,
    populationTotal: popStats.rows, populationMasters: popStats.masters,
    duplicateCanonicalMasters: dupMasters,
    batchProductMasters: new Set(ledger.map((x) => x.masterId)).size,
    batchKoDescriptions: ledger.length,
    existingEn: ledger.filter((x) => x.enDescriptionId).length,
    enMissing: ledger.filter((x) => !x.enDescriptionId).length,
    classification: counters,
    defectCodes: defectCounts, softSignals: softCounts,
    translationApiCalls: 0, translationSucceeded: 0, translationValidationFailed: 0,
    plannedNewEn: byClass('TRANSLATED_MISSING').length, plannedUpdateEn: byClass('RETRANSLATED_INVALID').length,
    plannedDbWrites: byClass('TRANSLATED_MISSING').length + byClass('RETRANSLATED_INVALID').length,
    totalsReconcile: {
      sum: Object.values(counters).reduce((a, b) => a + b, 0), manifest: ledger.length,
      ok: Object.values(counters).reduce((a, b) => a + b, 0) === ledger.length,
    },
    bySourceType: ledger.reduce((a: any, x) => { (a[x.sourceType] ||= {})[x.classification] = ((a[x.sourceType] || {})[x.classification] || 0) + 1; return a; }, {}),
  };

  fs.writeFileSync(P('otc-store-en-audit-batch01-ledger.ga.json'), JSON.stringify({ wo: WO, batchId: BATCH_ID, total: ledger.length, rows: ledger }, null, 1) + '\n', 'utf8');
  for (const [c, f] of [['PASS_EXISTING', 'pass-existing'], ['TRANSLATED_MISSING', 'translated-missing'], ['RETRANSLATED_INVALID', 'retranslate-invalid'], ['REVIEW_REQUIRED', 'review-required']] as const) {
    const rowsC = byClass(c);
    fs.writeFileSync(P(`otc-store-en-audit-batch01-${f}.ga.json`), JSON.stringify({ wo: WO, batchId: BATCH_ID, classification: c, total: rowsC.length, rows: c === 'PASS_EXISTING' ? rowsC.map((x) => ({ seq: x.seq, masterId: x.masterId, koDescriptionId: x.koDescriptionId, enDescriptionId: x.enDescriptionId, enHash: x.enHash })) : rowsC }, null, 1) + '\n', 'utf8');
  }
  fs.writeFileSync(P('otc-store-en-audit-batch01-summary.ga.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
