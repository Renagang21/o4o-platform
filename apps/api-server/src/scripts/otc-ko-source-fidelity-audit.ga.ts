/**
 * WO — 제품별 e약은요 공식 원문 ↔ 현재 KO STORE canonical **내용 정합성 전수검증** (READ-ONLY)
 *
 * 구조가 완전하다는 것과 그 제품의 공식 내용과 맞다는 것은 다른 문제다.
 * 구조 복구(aa5e529e7)는 "문서가 온전히 표시된다" 를 보장할 뿐, "이 제품 내용이 맞다" 는 보장이 아니다.
 * 이 스크립트는 **후자만** 판정한다.
 *
 * DB write 0 (`SET default_transaction_read_only = on`).
 *
 * ── 원칙 ──────────────────────────────────────────────────────────────────────
 *   · 기준은 **그 제품 자신의** e약은요 원문뿐이다.
 *   · 구조 READY 라는 이유로 번역을 승인하지 않는다.
 *   · 성분군·ATC·제품명이 같다는 이유로 다른 제품 설명서를 인정하지 않는다.
 *   · 애매하면 통과가 아니라 보류다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { slots, T, type Slot } from './otc-zh-slots.ga.js';
import { judgeDoc, roleOf } from './otc-ko-truncation-policy.ga.js';
import { assertSpec } from './otc-ko-truncation-policy.spec.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const inc = (m: Record<string, number>, k: string): void => { m[k] = (m[k] || 0) + 1; };
const alnum = (s: string): string => s.replace(/[^0-9A-Za-z가-힣]/g, '');

/* ── 공식 원문 섹션 분해 ───────────────────────────────────────────────────── */
type Off = { efficacy: string; dosage: string; caution: string; interaction: string; adverse: string; all: string };
function officialOf(html: string): Off {
  const o: Off = { efficacy: '', dosage: '', caution: '', interaction: '', adverse: '', all: T(html) };
  const re = /<strong>\s*([^<]+?)\s*<\/strong>([\s\S]*?)(?=<strong>|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const l = m[1].replace(/\s+/g, ''), b = T(m[2]);
    if (/효능|효과/.test(l)) o.efficacy += ' ' + b;
    else if (/용법|용량/.test(l)) o.dosage += ' ' + b;
    else if (/주의/.test(l)) o.caution += ' ' + b;
    else if (/상호작용/.test(l)) o.interaction += ' ' + b;
    else if (/이상반응/.test(l)) o.adverse += ' ' + b;
  }
  return o;
}
/* ── 현행 KO 섹션 (레이아웃 4종 흡수) ──────────────────────────────────────── */
function koOf(html: string, sl: Slot[]): Off {
  const pick = (ks: string[]): string => sl.filter((s) => ks.includes(s.kind)).map((s) => s.text).join(' ');
  const lab = (re: RegExp): string => {
    const m = new RegExp(`<strong>\\s*(?:${re.source})\\s*</strong>([\\s\\S]*?)(?=<strong>|</p>|$)`).exec(html);
    return m ? T(m[1]) : '';
  };
  const body = sl.filter((s) => roleOf(s.kind) !== 'label').map((s) => s.text).join(' ');
  return {
    /* 효능 비교에는 **intro 와 효능 라벨 절만** 쓴다.
       tile/badge 는 매장 템플릿 상용구(`품목기준코드…`, `매장 약사에게 문의`, `성분과 함량을 확인`)를
       담고 있어, 이를 포함하면 정상 문서가 대량으로 "원문에 없는 내용 추가" 로 오판된다
       (실측: 그렇게 했더니 7,177건이 EXTRA_EFFICACY 로 잡혔고 표본은 전부 원문 충실본이었다). */
    efficacy: pick(['intro']) + ' ' + lab(/효능[·ㆍ・]?\s*효과|사용\s*목적/),
    dosage: pick(['intake']) + ' ' + lab(/복용\s*안내|용법[·ㆍ・]?\s*용량|복용법|사용\s*안내/),
    caution: pick(['warn', 'foot']) + ' ' + lab(/주의\s*대상|사용상\s*주의사항|주의사항/),
    interaction: body, adverse: body, all: body,
  };
}

/* ── 안전 지문 축 ──────────────────────────────────────────────────────────── */
const S = (a: string[]): Set<string> => new Set(a);
const freq = (s: string): string[] => [...S((s.match(/1\s*일\s*\d+\s*회/g) || []).map((x) => x.replace(/\s+/g, '')))];
const perDose = (s: string): string[] => [...S((s.match(/1\s*회\s*\d+(?:[./]\d+)?\s*(?:정|캡슐|포|팩|병|mL|ml|㎖|g|mg|㎎|방울|매|스푼|앰플)/g) || []).map((x) => x.replace(/\s+/g, '')))];
const interval = (s: string): string[] => [...S((s.match(/\d+\s*(?:시간|일|주|개월)\s*(?:간격|마다|이상|이내|동안|간)/g) || []).map((x) => x.replace(/\s+/g, '')))];
function ageBounds(s: string): { lo: number | null; hi: number | null } {
  const lo: number[] = [], hi: number[] = [];
  const v = (n: string, u: string): number => (u === '개월' ? parseInt(n, 10) / 12 : parseInt(n, 10));
  for (const m of s.matchAll(/(?:만\s*)?(\d+)\s*(세|개월|살)\s*(이상|이하|미만|초과)/g)) {
    const x = v(m[1], m[2]); if (m[3] === '이상' || m[3] === '초과') lo.push(x); else hi.push(x);
  }
  return { lo: lo.length ? Math.min(...lo) : null, hi: hi.length ? Math.max(...hi) : null };
}
const ORAL = /(복용|먹|경구|삼키|씹어)/, TOPICAL = /(바르|도포|붙이|외용|patch|첩부)/;
function route(s: string): string {
  const o = ORAL.test(s), t = TOPICAL.test(s);
  return o && !t ? 'ORAL' : t && !o ? 'TOPICAL' : o && t ? 'MIXED' : 'UNKNOWN';
}
const PROHIBIT = /(마십시오|마세요|말고|말며|금지|금기|삼가|피하십시오|투여하지|복용하지|사용하지|않습니다)/;
/* 상담 안내 — 매장용 문안은 `매장 약사 등 전문가에게 문의하세요` 처럼 어절이 길다.
   좁은 거리 제한(6자)으로 잡으면 정상 문서가 대량으로 '상담 안내 누락' 으로 오판된다. */
const CONSULT = /((의사|약사|전문가)[^.]{0,24}(상의|상담|문의)|(상의|상담|문의)[^.]{0,24}(의사|약사|전문가))/;
/** 효능 핵심어 — 3자 이상 한글 명사구. 표현 차이를 흡수하려고 어간 3자로 절단해 비교한다. */
const stems = (s: string): Set<string> =>
  new Set((s.match(/[가-힣]{3,}/g) || []).map((w) => w.slice(0, 3)));

type Verdict = 'KO_SOURCE_MATCH' | 'KO_DISPLAY_ONLY_DIFFERENCE' | 'KO_MISSING_CONTENT' | 'KO_EXTRA_CONTENT'
  | 'KO_CONTRADICTED' | 'KO_WRONG_ATTRIBUTION' | 'KO_SOURCE_UNRESOLVED' | 'KO_STRUCTURE_REMAINING';

async function main(): Promise<void> {
  assertSpec();
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5730', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 1800000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  const docs = (await pool.query(`
    SELECT d.id::text ko_id, d.master_id::text mid, d.source_type, d.content, pm.name,
           pm.regulatory_type reg, pm.drug_category cat, pm.status pm_status
      FROM shared_product_descriptions d JOIN product_masters pm ON pm.id=d.master_id
     WHERE d.description_type='STORE' AND d.status='canonical' AND COALESCE(d.language,'ko')='ko'
       AND d.deleted_at IS NULL AND d.source_type IN
       ('mfds_drug_otc','mfds_drug_otc_nutrition_combo','o4o_drug_otc_topical','mfds_easy_drug','manual')`)).rows;
  const mids = [...new Set(docs.map((d: any) => d.mid))];
  const raw = new Map<string, string>();
  for (let i = 0; i < mids.length; i += 500)
    for (const r of (await pool.query(`SELECT master_id::text mid, content FROM shared_product_descriptions
       WHERE master_id = ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE'
         AND deleted_at IS NULL`, [mids.slice(i, i + 500)])).rows) if (!raw.has(r.mid)) raw.set(r.mid, r.content || '');
  await pool.end();

  const verdicts: Record<string, number> = {}, axisFail: Record<string, number> = {};
  const recs: any[] = [];

  for (const d of docs) {
    const html = String(d.content || '');
    const sl = slots(html);
    const findings: string[] = [];
    let v: Verdict;

    const onTarget = d.reg === 'DRUG' && d.cat === 'otc' && d.pm_status === 'ACTIVE';
    const blockedSlots = judgeDoc(html, sl).filter((x) => x.blocked).length;
    const rh = raw.get(d.mid);

    if (!onTarget) { findings.push(`OFF_TARGET:${d.reg}/${d.cat}`); v = 'KO_WRONG_ATTRIBUTION'; }
    else if (!rh || !rh.trim()) { findings.push('NO_OFFICIAL_SOURCE_ON_MASTER'); v = 'KO_SOURCE_UNRESOLVED'; }
    else {
      const off = officialOf(rh), ko = koOf(html, sl);

      /* ── 축별 대조 ─────────────────────────────────────────────────────── */
      const oF = freq(off.dosage), kF = freq(ko.dosage);
      const oD = perDose(off.dosage), kD = perDose(ko.dosage);
      const oI = interval(off.dosage + ' ' + off.caution), kI = interval(ko.dosage + ' ' + ko.caution);
      /* 연령은 **양쪽 모두 문서 전체**에서 뽑는다. 공식은 섹션 일부만 보고 현행은 전체를 보면
         공식의 이상반응·상호작용 절에 있는 연령을 놓쳐 없는 모순이 만들어진다
         (실측: 그렇게 했더니 AGE_HI 430건이 잡혔는데 독립검증에서 303건이 재현되지 않았다). */
      const oA = ageBounds(off.all), kA = ageBounds(ko.all);
      const oR = route(off.dosage), kR = route(ko.dosage || ko.all);

      /* 모순 — 양쪽 모두 값이 있는데 다르다 */
      const cFreq = oF.length > 0 && kF.length > 0 && !kF.every((x) => oF.includes(x));
      const cDose = oD.length > 0 && kD.length > 0 && !kD.every((x) => oD.includes(x));
      const cAgeLo = oA.lo != null && kA.lo != null && Math.abs(oA.lo - kA.lo) > 0.01;
      const cAgeHi = oA.hi != null && kA.hi != null && Math.abs(oA.hi - kA.hi) > 0.01;
      const cRoute = oR !== 'UNKNOWN' && kR !== 'UNKNOWN' && oR !== 'MIXED' && kR !== 'MIXED' && oR !== kR;
      if (cFreq) findings.push(`FREQ:off[${oF.join(',')}] ko[${kF.join(',')}]`);
      if (cDose) findings.push(`DOSE:off[${oD.join(',')}] ko[${kD.join(',')}]`);
      if (cAgeLo) findings.push(`AGE_LO:off[${oA.lo}] ko[${kA.lo}]`);
      if (cAgeHi) findings.push(`AGE_HI:off[${oA.hi}] ko[${kA.hi}]`);
      if (cRoute) findings.push(`ROUTE:off[${oR}] ko[${kR}]`);

      /* 누락 — 공식에 있는데 현행에 없다 */
      const missProhibit = PROHIBIT.test(off.caution) && !PROHIBIT.test(ko.caution + ' ' + ko.all);
      const missConsult = CONSULT.test(off.caution) && !CONSULT.test(ko.all);
      const missAge = oA.lo != null && kA.lo == null;
      const missFreq = oF.length > 0 && kF.length === 0;
      const missInterval = oI.length > 0 && kI.length === 0 && oI.length >= 2;
      const oEff = stems(off.efficacy), kEff = stems(ko.efficacy);
      const effKept = oEff.size ? [...oEff].filter((x) => kEff.has(x)).length / oEff.size : 1;
      const missEff = oEff.size >= 6 && effKept < 0.35;
      if (missProhibit) findings.push('MISS_PROHIBITION');
      if (missConsult) findings.push('MISS_CONSULT');
      if (missAge) findings.push('MISS_AGE');
      if (missFreq) findings.push('MISS_FREQ');
      if (missInterval) findings.push('MISS_INTERVAL');
      if (missEff) findings.push(`MISS_EFFICACY:${Math.round(effKept * 100)}%`);

      /* 추가 — 공식에 없는 내용이 현행에 있다 */
      const offAll = alnum(off.all);
      const extraFreq = kF.filter((x) => !oF.includes(x) && !offAll.includes(alnum(x)));
      const extraDose = kD.filter((x) => !oD.includes(x) && !offAll.includes(alnum(x)));
      const extraAgeLo = oA.lo == null && kA.lo != null && !/\d+\s*(세|개월|살)/.test(off.all);
      const extraEff = [...kEff].filter((x) => !oEff.has(x) && !offAll.includes(x));
      if (extraFreq.length) findings.push(`EXTRA_FREQ:${extraFreq.join(',')}`);
      if (extraDose.length) findings.push(`EXTRA_DOSE:${extraDose.join(',')}`);
      if (extraAgeLo) findings.push(`EXTRA_AGE:${kA.lo}`);
      /* 관측용 — 판정에는 쓰지 않는다. 소비자용 재작성은 원문에 없는 어휘를 정상적으로 쓴다. */
      if (kEff.size >= 8 && extraEff.length / kEff.size > 0.6) findings.push(`OBS_EXTRA_EFFICACY_VOCAB:${Math.round(extraEff.length / kEff.size * 100)}%`);

      /* ── 판정 (안전 우선순위) ──────────────────────────────────────────── */
      const contradicted = cFreq || cDose || cAgeLo || cAgeHi || cRoute;
      /* 효능이 거의 겹치지 않으면서 현행 고유 내용이 대부분이면 다른 제품 설명서로 본다 */
      const wrongAttr = oEff.size >= 6 && effKept < 0.20 && kEff.size >= 6 && extraEff.length / kEff.size > 0.8;
      const missing = missProhibit || missConsult || missAge || missFreq || missInterval || missEff;
      /* 실질 위험은 **수치·용량·연령의 추가**다. 어휘 추가는 판정 근거로 쓰지 않는다. */
      const extra = extraFreq.length > 0 || extraDose.length > 0 || extraAgeLo;

      v = wrongAttr ? 'KO_WRONG_ATTRIBUTION'
        : contradicted ? 'KO_CONTRADICTED'
        : blockedSlots > 0 ? 'KO_STRUCTURE_REMAINING'
        : missing ? 'KO_MISSING_CONTENT'
        : extra ? 'KO_EXTRA_CONTENT'
        : findings.length ? 'KO_DISPLAY_ONLY_DIFFERENCE'
        : 'KO_SOURCE_MATCH';
    }
    /* 구조 잔존은 원문 없음/귀속 오류보다 뒤에 온다 — 그쪽이 더 근본 문제다 */
    if (v === 'KO_SOURCE_UNRESOLVED' && blockedSlots > 0) findings.push(`STRUCTURE_BLOCKED:${blockedSlots}`);

    inc(verdicts, v);
    for (const f of findings) inc(axisFail, f.split(':')[0]);
    recs.push({ koId: d.ko_id, mid: d.mid, name: d.name, sourceType: d.source_type, verdict: v,
      blockedSlots, findings });
  }

  const translatable = (verdicts.KO_SOURCE_MATCH || 0) + (verdicts.KO_DISPLAY_ONLY_DIFFERENCE || 0);
  const summary = {
    mode: 'READ-ONLY / DB write 0',
    scope: '현재 KO STORE canonical 전량 — 구조 READY 여부와 무관하게 내용 정합성만 판정',
    total: docs.length, verdicts,
    balanced: Object.values(verdicts).reduce((a, b) => a + b, 0) === docs.length,
    axisFail,
    translatable,
    bySourceType: recs.reduce((a: Record<string, Record<string, number>>, r) => {
      (a[r.sourceType] ||= {}); inc(a[r.sourceType], r.verdict); return a; }, {}),
  };
  fs.writeFileSync(P('otc-ko-source-fidelity.ga.json'), JSON.stringify({ summary }, null, 1), 'utf8');
  fs.writeFileSync(P('otc-ko-source-fidelity-classification.ga.json'),
    JSON.stringify({ total: recs.length, docs: recs }, null, 1), 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
