/**
 * WO-O4O-DRUG-OTC-EN-NONORAL-VERB-SOURCE-ADJUDICATION-AND-MINIMAL-FIX-V1
 *   — 비경구 제품 EN 경구동사 240건 **문장 단위 판정** (READ-ONLY · DB write 0)
 *
 * 판정 원칙
 *   1) 제품 단위가 아니라 **검출 문장 단위**로 판정한다.
 *   2) "비경구인데 take 가 있다"는 사실만으로 오류로 보지 않는다.
 *      공식 KO 원문(e약은요) 또는 KO canonical 에 경구 의미가 실제로 있으면 정상이다.
 *   3) EN·KO 대조가 최종 기준이다. 근거를 못 만들면 추정하지 않고 검토/차단으로 분리한다.
 *
 * 핵심 판별축 — **경구 경로 표지의 유무**
 *   "by mouth / orally / internally / swallow / eat" 처럼 **경로가 명시된** 문장은
 *   원문의 `먹지 마십시오`·`복용하지 마십시오`·`실수로 먹었을 경우` 를 옮긴 것이다(정상).
 *   경로 표지 없이 제품 자체에 `take` 만 쓰인 문장이 `사용/도포/점안/삽입` 의 오역 후보다.
 *   이 축은 코드가 아니라 실측(97 템플릿 전수 열람)에서 도출했다.
 *
 * 대조 근거 3중
 *   ① 현재 EN 문장  ② 정렬된 KO canonical 문장(섹션 내 문장 수가 일치할 때만)
 *   ③ 공식 원문 섹션의 한국어 앵커(복용/사용 등)
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-en-nonoral-verb-adjudication.ga.ts [--port 5524]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const WO = 'WO-O4O-DRUG-OTC-EN-NONORAL-VERB-SOURCE-ADJUDICATION-AND-MINIMAL-FIX-V1';
const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };

/**
 * scope=input240 : 기존 감사 입력 240건(원 감사가 로드한 route 원장 5종 기준)
 * scope=all540   : route 원장 7종 전부를 써서 **동일 검출 조건**으로 재현한 비경구 전수
 *                  (원 감사가 `nr26`·`route535` 원장을 로드하지 않아 300건이 빠져 있었다)
 */
const SCOPE = (arg('--scope') || 'input240') as 'input240' | 'all540';
const SFX = SCOPE === 'all540' ? '-all540' : '';
const OUT_ALL = P(`otc-en-nonoral-verb-adjudication${SFX}.ga.json`);
const OUT_INVALID = P(`otc-en-nonoral-verb-invalid-targets${SFX}.ga.json`);
const OUT_REVIEW = P(`otc-en-nonoral-verb-review-blocked${SFX}.ga.json`);
const OUT_SUMMARY = P(`otc-en-nonoral-verb-summary${SFX}.ga.json`);
const ROUTE_LEDGERS_ORIGINAL = ['otc-v4-carryover72-prep.ga.json', 'otc-v4-finalall-prep.ga.json', 'otc-v4-next2000-prep.ga.json', 'otc-v4-pilot-500-prep.ga.json', 'otc-v4-pilot-100-prep.ga.json'];
const ROUTE_LEDGERS_EXTRA = ['otc-v4-nr26-prep.ga.json', 'otc-v4-route535-prep.ga.json'];
function routeMap(files: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of files) {
    try { for (const r of J(f).rows || []) if (r.route && !m.has(r.masterId)) m.set(r.masterId, r.route); } catch { /* 없으면 skip */ }
  }
  return m;
}

/* ── 텍스트 추출 ─────────────────────────────────────────────────────────────── */
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const strip = (s: string): string => unesc(s.replace(/<[^>]+>/g, ''));

type Block = { label: string; kind: string; texts: string[] };
/** h2 순서로 본문 블록화. 라벨은 언어마다 다르므로 **순서(index)** 로 EN↔KO 를 대응시킨다. */
function blocks(html: string): Block[] {
  const out: Block[] = [];
  const marks = [...html.matchAll(/<h2>([^<]*)<\/h2>/g)];
  for (let i = 0; i < marks.length; i++) {
    const label = strip(marks[i][1]).trim();
    const from = marks[i].index! + marks[i][0].length;
    const to = i + 1 < marks.length ? marks[i + 1].index! : html.length;
    const seg = html.slice(from, to);
    const texts: string[] = [];
    let kind = 'other';
    const intake = seg.match(/<p class="sd-intake">([\s\S]*?)<\/p>/);
    if (intake) { kind = 'intake'; for (const l of intake[1].split(/<br\s*\/?>|\n/)) { const t = strip(l).trim(); if (t) texts.push(t); } }
    const uls = seg.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || [];
    if (uls.length) { kind = 'warn'; for (const ul of uls) for (const li of ul.match(/<li>([\s\S]*?)<\/li>/g) || []) { const t = strip(li.replace(/<\/?li>/g, '')).trim(); if (t) texts.push(t); } }
    if (seg.includes('sd-core')) kind = 'core';
    out.push({ label, kind, texts });
  }
  return out;
}
/** 문장 분해. 한국어 본문은 `마십시오.이 약을` 처럼 공백 없이 이어지므로 다음 글자가 한글이어도 경계다. */
function sentences(t: string, lang: 'en' | 'ko'): string[] {
  const out: string[] = []; let depth = 0, start = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if ('([（［'.includes(c)) depth++;
    else if (')]）］'.includes(c)) depth = Math.max(0, depth - 1);
    else if (/[.!?]/.test(c) && depth === 0) {
      const next = t[i + 1] || ' ', prev = t[i - 1] || '';
      if (c === '.' && /\d/.test(prev) && /\d/.test(next)) continue;
      /** 저작기가 li 를 병합하면 `medicine.Before` 처럼 공백 없이 이어진다 — 대문자/한글도 경계로 본다 */
      const glued = lang === 'ko' ? /[가-힣]/.test(next) : /[A-Z]/.test(next) && !/\b[A-Z]$/.test(t.slice(0, i));
      if (/\s/.test(next) || i === t.length - 1 || glued) {
        const s = t.slice(start, i + 1).trim(); if (s) out.push(s); start = i + 1;
      }
    }
  }
  const rest = t.slice(start).trim(); if (rest) out.push(rest);
  return out;
}
/* 공식 원문(e약은요) 섹션 */
function officialSections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = strip(m[2]).replace(/\s+/g, ' ').trim();
  return out;
}

/* ── 어휘 규칙 (실측 97 템플릿 전수 열람에서 도출) ────────────────────────────── */
/** 원 검출기와 동일 어휘 + 굴절형 */
const TRIGGER = /\b(take|takes|taking|taken|swallow|swallows|swallowing|swallowed|orally|by mouth)\b/gi;
/**
 * 경구동사가 아닌 관용구 — take care / take off / take into account.
 * **수동태 `care must be taken` 를 반드시 포함한다**(실측: topical 6건이 이 형태로 오분류됐다).
 */
const IDIOM = /\btak(?:e|es|ing|en)\s+(?:care|off)\b|\bcare\s+(?:must|should|shall|has to|had to|is to|is|be)\s+(?:be\s+)?taken\b|\binto\s+account\b/gi;
/**
 * 경구동사의 목적어가 **이 약 자체**인 형태 — 다른 의약품 언급보다 우선한다.
 * `them` 은 제외한다: 복수형 선행사는 이 약(단수)이 아니라 앞서 언급된 다른 약이다
 * (실측: "…people who are taking MAO inhibitors … or stopped taking **them**" 4건이 이 때문에 오분류됐다).
 */
const PRODUCT_OBJECT = /\btak(?:e|es|ing|en)\s+(?:it|this\s+(?:medicine|drug|product)|the\s+medicine)\b/i;
/** 경구 **경로 표지** — 이 표지가 있으면 문장 자체가 경구 경로를 말한다 */
const ORAL_ROUTE_MARK = /\b(by mouth|orally|internally|swallow|swallows|swallowing|swallowed|eaten|eat|oral(?:ly)?\s+(?:administration|route)|taken? by mouth)\b/i;
/** 다른 의약품을 가리키는 목적어 */
const OTHER_DRUG = /\b(MAO\b|monoamine|antidepressant|antipsychotic|antiparkinson|mood regulator|mood stabilizer|tricyclic|tetracyclic|antihypertensive|cimetidine|propranolol|diuretic|warfarin|acetaminophen|antipyretic|anti-inflammatory|analgesic|antibiotic|amphotericin|polyene|suppositor|ointment|cream|barbiturate|opiate|tranquilizer|anesthetic|beta blocker|cardiac glycoside|lithium|methotrexate|furosemide|aspirin|ACE inhibitor|scopolia|glycyrrhizic|methylephedrine|other (?:medicine|product|drug)|another (?:medicine|product|drug)|them\b|it together with)/i;
/** 저작기가 KO `복용(사용)` 병기를 옮긴 형태 — 원문 표기 보존이므로 오역이 아니다 */
const HEDGED = /\btak(?:e|es|ing|en)\s*\(\s*(?:use|using)\s*\)|\busing\s*\(\s*tak(?:e|ing)\s*\)/i;
/** 우발 섭취 */
const ACCIDENTAL = /\b(by mistake|accidentally|if (?:it is |this medicine is )?swallowed)\b/i;

/* 한국어 앵커 */
const KO_ORAL = /(복용|먹|삼키|내복|경구)/;
const KO_NONORAL = /(사용|바르|도포|점안|넣|삽입|붙이|분무|뿌리|주입|적용)/;

/**
 * 확정 오역 문장의 **최소 교정 사전**.
 *
 * 대응 KO 문장이 전부 `사용` 계열이므로 대응 영어 동사는 `use` 다.
 * route 동사(apply/instill/insert)는 KO 가 `도포/점안/삽입` 이라고 말할 때만 쓴다 —
 * 여기서 apply/instill 로 바꾸면 원문에 없는 동작을 추가하는 것이 된다.
 * 치환은 **동사구 한 곳**만 건드리고 문장의 나머지는 byte 단위로 보존한다.
 */
const FIX_MAP: Array<{ find: RegExp; repl: string; koAnchor: RegExp }> = [
  { find: /\bBefore taking this (medicine|drug)\b/g, repl: 'Before using this $1', koAnchor: /사용하기 전에/ },
  { find: /\bbefore taking this (medicine|drug)\b/g, repl: 'before using this $1', koAnchor: /사용하기 전에/ },
  { find: /\bmust not take this (medicine|drug)\b/g, repl: 'must not use this $1', koAnchor: /사용하지 ?마/ },
  { find: /\bshould not take this (medicine|drug)\b/g, repl: 'should not use this $1', koAnchor: /사용하지 ?마/ },
  { find: /\bDo not take this (medicine|drug)\b/g, repl: 'Do not use this $1', koAnchor: /사용하지 ?마/ },
  { find: /\bstop taking it\b/g, repl: 'stop using it', koAnchor: /사용을 ?(즉각 )?중지/ },
  { find: /\bstop taking this (medicine|drug)\b/g, repl: 'stop using this $1', koAnchor: /사용을 ?(즉각 )?중지/ },
  { find: /\bIf you take this (medicine|drug)\b/g, repl: 'If you use this $1', koAnchor: /사용/ },
  { find: /\bif you take this (medicine|drug)\b/g, repl: 'if you use this $1', koAnchor: /사용/ },
  { find: /\bif you take it\b/g, repl: 'if you use it', koAnchor: /사용/ },
  { find: /\bIf you take it\b/g, repl: 'If you use it', koAnchor: /사용/ },
];
/** 문장에 사전을 적용해 최소 교정안을 만든다. 사전이 못 덮으면 null(자동 교정 대상 아님). */
function proposeFix(sentence: string, koSentence: string | null): { proposed: string; rule: string } | null {
  let out = sentence, rule = '';
  for (const f of FIX_MAP) {
    if (!f.find.test(out)) { f.find.lastIndex = 0; continue; }
    f.find.lastIndex = 0;
    if (koSentence && !f.koAnchor.test(koSentence)) continue;   // KO 앵커가 없으면 적용하지 않는다
    out = out.replace(f.find, f.repl);
    rule += (rule ? ' + ' : '') + f.find.source;
  }
  if (out === sentence) return null;
  /* 잔여 검증: 교정 후 문장에 제품 대상 경구동사가 남아 있으면 자동 교정 대상에서 뺀다 */
  if (PRODUCT_OBJECT.test(out) && !ORAL_ROUTE_MARK.test(out)) return null;
  return { proposed: out, rule };
}

type Verdict = 'VALID_SOURCE_GROUNDED' | 'INVALID_ROUTE_VERB' | 'AMBIGUOUS_REVIEW' | 'DETECTOR_FALSE_POSITIVE' | 'SOURCE_OR_LINKAGE_BLOCKED';

async function main(): Promise<void> {
  const port = parseInt(arg('--port') || process.env.PROXY_PORT || '5524', 10);
  const input = J('otc-en-coverage-incomplete-list.ga.json');
  const inputRows: any[] = input.rows;
  const pool = new Pool({ host: '127.0.0.1', port, database: 'o4o_platform', max: 4, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  let ids: string[], routeBy: Map<string, string>;
  if (SCOPE === 'input240') {
    ids = inputRows.map((r) => r.masterId);
    routeBy = new Map<string, string>(inputRows.map((r) => [r.masterId, r.route]));
  } else {
    /* 원 검출기와 **동일한 술어**로 비경구 전수를 재현한다(코호트가 아니라 데이터가 대상을 정한다) */
    routeBy = routeMap([...ROUTE_LEDGERS_ORIGINAL, ...ROUTE_LEDGERS_EXTRA]);
    const hits = (await pool.query(
      `SELECT s.master_id::text mid FROM shared_product_descriptions s
        WHERE s.description_type='STORE' AND s.language='en' AND s.source_type='mfds_drug_otc'
          AND s.status='canonical' AND s.deleted_at IS NULL
          AND s.content ~* '\\m(take|takes|taken|taking|swallow|orally|by mouth)\\M'`)).rows as any[];
    ids = hits.map((h) => h.mid).filter((m) => {
      const rt = routeBy.get(m); return !!rt && rt !== 'oral' && rt !== 'unknown';
    }).sort();
  }
  void ROUTE_LEDGERS_ORIGINAL;

  const leaflets = (await pool.query(
    `SELECT s.master_id::text mid, s.id::text id, COALESCE(s.language,'ko') lang, s.content,
            s.source_type stype, s.source_ref_id::text sref, s.status, s.description_type dtype, pm.name pname
       FROM shared_product_descriptions s JOIN product_masters pm ON pm.id = s.master_id
      WHERE s.master_id = ANY($1::uuid[]) AND s.source_type='mfds_drug_otc' AND s.description_type='STORE'
        AND s.status='canonical' AND s.deleted_at IS NULL`, [ids])).rows as any[];
  const official = (await pool.query(
    `SELECT DISTINCT ON (s.master_id) s.master_id::text mid, s.content, s.status
       FROM shared_product_descriptions s
      WHERE s.master_id = ANY($1::uuid[]) AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY s.master_id, (s.status='canonical') DESC, length(s.content) DESC`, [ids])).rows as any[];
  await pool.end();

  const docBy = new Map<string, any>();
  for (const r of leaflets) { const o = docBy.get(r.mid) || { mid: r.mid, pname: r.pname }; o[r.lang] = r; docBy.set(r.mid, o); }
  const offBy = new Map<string, Record<string, string>>();
  const offStatus = new Map<string, string>();
  for (const o of official) { offBy.set(o.mid, officialSections(o.content)); offStatus.set(o.mid, o.status); }

  const rows: any[] = [];
  const counters: Record<string, number> = {};
  const bump = (k: string): void => { counters[k] = (counters[k] || 0) + 1; };

  for (const mid of ids) {
    const d = docBy.get(mid);
    const route = routeBy.get(mid)!;
    const en = d?.en, ko = d?.ko;
    const off = offBy.get(mid);
    const base = {
      masterId: mid, productName: d?.pname ?? null, route,
      enDescriptionId: en?.id ?? null, koDescriptionId: ko?.id ?? null,
      enSourceType: en?.stype ?? null, enSourceRef: en?.sref ?? null,
      koSourceType: ko?.stype ?? null, koSourceRef: ko?.sref ?? null,
      officialSourceStatus: offStatus.get(mid) ?? null,
    };
    if (!en || !ko) {
      rows.push({ ...base, section: null, enSentence: null, koSentence: null, officialSentence: null,
        trigger: null, verdict: 'SOURCE_OR_LINKAGE_BLOCKED' as Verdict, basis: 'KO 또는 EN canonical 부재',
        needsFix: false, humanReview: true, recommendedFix: null });
      bump('SOURCE_OR_LINKAGE_BLOCKED'); continue;
    }
    const be = blocks(String(en.content)), bk = blocks(String(ko.content));
    for (let bi = 0; bi < be.length; bi++) {
      const se = be[bi].texts.flatMap((t) => sentences(t, 'en'));
      const sk = bk[bi] ? bk[bi].texts.flatMap((t) => sentences(t, 'ko')) : [];
      const aligned = bk[bi] && se.length === sk.length;      // 섹션 단위 1:1 정렬 성립 여부
      for (let si = 0; si < se.length; si++) {
        const sent = se[si];
        TRIGGER.lastIndex = 0;
        const hits = sent.match(TRIGGER);
        if (!hits) continue;
        const koSent = aligned ? sk[si] : null;

        /* 공식 원문 섹션 — 블록 라벨이 아니라 내용 축으로 고른다 */
        const sectionKey = be[bi].kind === 'intake' ? '용법·용량'
          : /interaction/i.test(be[bi].label) ? '상호작용'
            : /side effect/i.test(be[bi].label) ? '이상반응'
              : /warning|precaution/i.test(be[bi].label) ? '사용상 주의사항' : null;
        const offText = off ? (sectionKey ? (off[sectionKey] ?? '') : Object.values(off).join(' ')) : '';
        const offAll = off ? Object.values(off).join(' ') : '';

        /* ── 판정 ──────────────────────────────────────────────────────────── */
        const withoutIdiom = sent.replace(IDIOM, ' ');
        TRIGGER.lastIndex = 0;
        const realHits = withoutIdiom.match(TRIGGER);
        let verdict: Verdict, basis: string, needsFix = false, recommendedFix: string | null = null;

        if (!realHits) {
          verdict = 'DETECTOR_FALSE_POSITIVE';
          basis = 'take care / take off / into account 등 관용구 — 경구동사 아님';
        } else if (HEDGED.test(sent)) {
          verdict = 'VALID_SOURCE_GROUNDED';
          basis = 'KO 원문의 `복용(사용)` 병기를 그대로 옮긴 형태 — 오역 아님';
        } else if (ORAL_ROUTE_MARK.test(sent)) {
          /* 경로가 명시된 문장: 금지(먹지 마십시오)·우발섭취(실수로 먹었을 경우)·경구 병용 */
          const koHasOral = koSent ? KO_ORAL.test(koSent) : null;
          const offHasOral = KO_ORAL.test(offAll);
          if (koHasOral === true || offHasOral) {
            verdict = 'VALID_SOURCE_GROUNDED';
            basis = ACCIDENTAL.test(sent)
              ? '우발 섭취 문맥 + KO 근거(실수로 먹/삼키) 존재'
              : '경구 경로 표지 명시(금지·병용 등) + KO 경구 표현 근거 존재';
          } else {
            verdict = 'AMBIGUOUS_REVIEW';
            basis = '경구 경로 표지는 있으나 KO/공식 원문에서 경구 표현을 확인하지 못함';
          }
        } else if (OTHER_DRUG.test(sent) && !PRODUCT_OBJECT.test(sent)) {
          /* 다른 의약품이 언급되더라도 **목적어가 이 약이면** 아래 오역 판정으로 내려보낸다 */
          verdict = 'VALID_SOURCE_GROUNDED';
          basis = '경구동사의 대상이 이 약이 아니라 다른 의약품(병용·복용 중 상태)';
        } else {
          /* 경로 표지 없이 제품 자체에 take — 오역 후보. 근거로만 확정한다. */
          if (!off) {
            verdict = 'SOURCE_OR_LINKAGE_BLOCKED';
            basis = '공식 KO 원문 없음 — 판정 근거 확보 불가';
          } else if (koSent === null) {
            verdict = 'AMBIGUOUS_REVIEW';
            basis = '섹션 문장 수 불일치로 대응 KO 문장을 특정할 수 없음';
          } else if (KO_ORAL.test(koSent)) {
            verdict = 'VALID_SOURCE_GROUNDED';
            basis = `대응 KO 문장에 경구 표현 존재`;
          } else if (KO_NONORAL.test(koSent)) {
            verdict = 'INVALID_ROUTE_VERB';
            basis = '대응 KO 문장은 비경구 동작(사용/도포/점안/삽입 등)인데 EN 이 제품 자체를 복용하도록 옮김';
            needsFix = true;
            recommendedFix = 'take 계열 동사구 한 곳만 KO 원문의 `사용` 에 대응하는 use 로 치환(나머지 문장 byte 보존)';
          } else {
            verdict = 'AMBIGUOUS_REVIEW';
            basis = '대응 KO 문장에서 경구·비경구 어느 쪽 표현도 확인되지 않음';
          }
        }
        bump(verdict);
        const fix = needsFix ? proposeFix(sent, koSent) : null;
        if (needsFix && !fix) { needsFix = false; verdict = 'AMBIGUOUS_REVIEW'; basis += ' — 다만 최소 교정 사전이 이 문형을 덮지 못해 자동 대상에서 제외'; counters['INVALID_ROUTE_VERB']--; bump('AMBIGUOUS_REVIEW'); }
        rows.push({
          proposedSentence: fix?.proposed ?? null, fixRule: fix?.rule ?? null,
          ...base, section: be[bi].label, sectionKind: be[bi].kind, blockIndex: bi, sentenceIndex: si,
          alignedSection: !!aligned, enSentence: sent, koSentence: koSent,
          officialSectionKey: sectionKey, officialExcerpt: offText ? offText.slice(0, 400) : null,
          trigger: [...new Set((realHits || hits).map((h) => h.toLowerCase()))].join(','),
          verdict, basis, needsFix, humanReview: verdict === 'AMBIGUOUS_REVIEW' || verdict === 'SOURCE_OR_LINKAGE_BLOCKED',
          recommendedFix,
        });
      }
    }
  }

  /* ── 집계 ─────────────────────────────────────────────────────────────────── */
  const byVerdictRoute: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    (byVerdictRoute[r.verdict] ||= {})[r.route] = ((byVerdictRoute[r.verdict] || {})[r.route] || 0) + 1;
  }
  const docsOf = (pred: (r: any) => boolean): number => new Set(rows.filter(pred).map((r) => r.masterId)).size;
  const summary = {
    wo: WO, kind: 'en-nonoral-verb-adjudication', scope: SCOPE, mode: 'READ-ONLY', liveDbWrite: 0,
    inputRows: inputRows.length, inputDistinctMasters: new Set(ids).size,
    productMasters: new Set(rows.map((r) => r.masterId)).size,
    descriptions: new Set(rows.map((r) => r.enDescriptionId).filter(Boolean)).size,
    detectedSentences: rows.filter((r) => r.enSentence).length,
    adjudications: rows.length,
    byVerdict: counters,
    byVerdictRoute,
    docsByVerdict: Object.fromEntries(Object.keys(counters).map((v) => [v, docsOf((r) => r.verdict === v)])),
    fixTargetDescriptions: docsOf((r) => r.needsFix),
    fixTargetSentences: rows.filter((r) => r.needsFix).length,
    humanReviewSentences: rows.filter((r) => r.humanReview).length,
    totalsReconcile: {
      sum: Object.values(counters).reduce((a, b) => a + b, 0), adjudications: rows.length,
      ok: Object.values(counters).reduce((a, b) => a + b, 0) === rows.length,
    },
  };
  fs.writeFileSync(OUT_ALL, JSON.stringify({ wo: WO, total: rows.length, rows }, null, 1) + '\n', 'utf8');
  fs.writeFileSync(OUT_INVALID, JSON.stringify({ wo: WO, total: rows.filter((r) => r.needsFix).length, rows: rows.filter((r) => r.needsFix) }, null, 1) + '\n', 'utf8');
  fs.writeFileSync(OUT_REVIEW, JSON.stringify({ wo: WO, total: rows.filter((r) => r.humanReview).length, rows: rows.filter((r) => r.humanReview) }, null, 1) + '\n', 'utf8');
  fs.writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
