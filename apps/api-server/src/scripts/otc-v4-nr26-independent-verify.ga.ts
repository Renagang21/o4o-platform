/**
 * WO-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-ROUTE-PROFILE-FINAL-READINESS-V1
 *   — nasal 14 + rectal 12 (26 master) **PRE_APPLY 독립검증기** (READ-ONLY)
 *
 * ⚠️ 독립성 계약(§13): select · profile · compose · author · tm-shard · executor 의 어떤 함수도
 *    import 하지 않는다. 섹션 파서 · sourceRef 산식 · 수치/연령/기간 추출 · route 마커 · 검증 SQL 을
 *    이 파일에서 독자적으로 재구현하고, 산출기가 보고한 값을 믿지 않고 **DB·파일 실측으로 재판정**한다.
 *
 * ⚠️ 본 WO 는 LIVE apply 를 하지 않는다. 따라서 판정 대상은 "생산 결과"가 아니라
 *    **PRE_APPLY 상태 + 산출물 품질 + rollback 잔여 0 + LIVE write 0** 이다.
 *
 * 실행:
 *   ../../node_modules/.bin/tsx src/scripts/otc-v4-nr26-independent-verify.ga.ts --port 5495
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Pool } from 'pg';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const PORT = parseInt(arg('--port') || process.env.PROXY_PORT || '5495', 10);

const WO = 'WO-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-ROUTE-PROFILE-FINAL-READINESS-V1';
const BATCH = 'otc-v4-nr26';
const AUTHORED_V4 = 'mfds_drug_otc';
const EASY = 'mfds_easy_drug';
/** V2/V3 저작 source_type 포함 — 기존 authored 점유 판정은 넓게 본다. */
const AUTHORED_ANY = ['mfds_drug_otc', 'mfds_drug_otc_v2', 'mfds_drug_otc_v3'];
const SECTION_COVERAGE_MIN = 0.95;
const SECTIONS = ['효능·효과', '용법·용량', '경고', '사용상 주의사항', '이상반응', '상호작용'];

// 입력 원장
const CARRYOVER = P('otc-v4-route-673-carryover-ledger.ga.json');
const SELECTION = P('otc-v4-nr26-selection-ledger.ga.json');
const KO_PAYLOAD = P('otc-v4-nr26-ko-payload.ga.json');
const EN_PAYLOAD = P('otc-v4-nr26-en-payload.ga.json');
const DRY = (u: string): string => P(`otc-v4-nr26-dryrun-${u}.ga.json`);
const DRY_PLAN = (u: string): string => P(`otc-v4-nr26-dryrun-plan-${u}.ga.json`);
const RB = (u: string): string => P(`otc-v4-nr26-rollback-test-${u}.ga.json`);
// 오염 대조군
const EXCLUDE = P('otc-easy-drug-remaining-3809-exclude-ledger-v1.json');
const SRC_TERMINAL = P('otc-easy-drug-remaining-3809-agent-na-exception-queue-v1.json');
const WITHDRAWN = P('otc-v4-route535-withdraw-nonhuman.ga.json');
const GREEN_LEDGERS = [
  'otc-v4-pilot-100-green-ledger.ga.json',
  'otc-v4-pilot-500-green-ledger.apply-run1.ga.json',
  'otc-v4-next2000-green-ledger.run-20260729T154307.ga.json',
  'otc-v4-finalall-green-ledger.run-20260729T201556.ga.json',
  'otc-v4-route535-green-ledger.run-ROUTE535FINAL.ga.json',
].map(P);
const OUT = P('otc-v4-nr26-independent-verification.ga.json');

const J = (f: string): any => JSON.parse(fs.readFileSync(f, 'utf8'));
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const sha = (s: string): string => crypto.createHash('sha256').update(s).digest('hex');

// ── 독자 재구현 ────────────────────────────────────────────────────────────────────
/** 공식 원문 6섹션 — 산출기와 다른 경로(전체 <p> 를 훑어 strong 헤딩을 가진 것만 채택). */
function officialSections(html: string): Record<string, string> {
  const out: Record<string, string> = Object.fromEntries(SECTIONS.map((k) => [k, '']));
  for (const m of html.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const blk = m[1];
    const h = /^<strong>([^<]+)<\/strong><br\s*\/?>/.exec(blk);
    if (!h) continue;
    const key = h[1].trim();
    if (!SECTIONS.includes(key)) continue;
    out[key] = blk.slice(h[0].length).trim();
  }
  return out;
}
/** sourceRef 독자 산식 — namespace 문자열까지 직접 쓴다(계약 모듈 import 금지). */
function refOf(masterId: string): string {
  const h = md5(`otc-v4-master-leaflet:${masterId}`);
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join('-');
}
const plain = (html: string): string => html
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').trim();
/** 비경구 제품에서 공식 원문의 복용/투여 → 사용 치환은 확립된 동작. 양쪽 정규화 후 비교한다. */
const verbNorm = (s: string): string => s.replace(/복용|투여/g, '사용');
const nums = (s: string): string[] => (s.match(/[0-9]+(?:[.][0-9]+)?/g) || []);
const ageTokens = (s: string): string[] => (s.match(/(만\s*)?[0-9]+\s*(세|개월|살)/g) || []);
const durTokens = (s: string): string[] => (s.match(/[0-9]+\s*(일|주|개월|시간|분|회)/g) || []);
const norm = (a: string[]): string[] => [...new Set(a.map((s) => s.replace(/\s+/g, '')))];

/** §6·§7 금지 표현 — profile 모듈을 import 하지 않고 여기서 다시 쓴다. */
const KO_FORBIDDEN: Record<string, Array<[string, RegExp]>> = {
  nasal: [['경구', /복용하십시오|삼키십시오|먹습니다|드십시오/], ['점안', /점안하|눈에\s*(넣|점적)|결막낭/],
    ['피부도포', /환부에\s*바르|피부에\s*바르|도포하십시오/], ['질내', /질\s*(내|안|강)에\s*삽입/], ['직장', /직장\s*(내|안)에\s*삽입|좌약을\s*삽입/]],
  rectal: [['경구', /복용하십시오|삼키십시오|먹습니다|드십시오/], ['질내', /질\s*(내|안|강)에\s*삽입/],
    ['피부도포', /환부에\s*바르|피부에\s*바르|도포하십시오/], ['점안', /점안하|눈에\s*(넣|점적)/], ['비강', /콧구멍|비강\s*(내|에)\s*분무/]],
};
/** 자기 경로 표현이 실제로 남아 있는가(경로 소실 탐지). */
const KO_OWN: Record<string, RegExp> = {
  nasal: /비강|콧구멍|코\s*(안|속)|분무|뿌리|점비/,
  rectal: /직장|좌약|항문|관장/,
};
const EN_FORBIDDEN: Record<string, Array<[string, RegExp]>> = {
  nasal: [['oral', /\b(swallow|by mouth|orally|take .{0,20}\b(tablet|capsule)s?\b)/i], ['ophthalmic', /\b(eye|eyes|conjunctival)\b/i],
    ['vaginal', /\bvagina/i], ['rectal', /\b(rectum|rectal|suppositor)/i]],
  rectal: [['oral', /\b(swallow|by mouth|orally)\b/i], ['vaginal', /\bvagina/i], ['nasal', /\b(nostril|nasal cavity|spray into)/i],
    ['ophthalmic', /\b(eye|eyes|conjunctival)\b/i]],
};
/**
 * EN 금지 계열 마커의 **공식 근거** — 공식 원문에 같은 계열 언급이 있으면 역전이 아니다.
 * 예: 직장용 좌제 공식 원문 "이 약은 직장에만 사용하고 내복용으로는 사용하지 마십시오" →
 *     EN "do not use it orally" 는 충실한 번역이며 경구 오도입이 아니다.
 * 단 **부정문일 때만** 면제한다. 긍정 지시로 뒤집히면 그대로 역전으로 잡힌다.
 */
const EN_EVIDENCE_KO: Record<string, RegExp> = {
  oral: /내복용|복용|경구|먹|삼키|마시/,
  ophthalmic: /눈|점안|결막|안구/,
  vaginal: /질/,
  nasal: /코|비강|콧구멍|점비/,
  rectal: /직장|좌약|항문|관장/,
};
const EN_NEGATED = /\b(do not|does not|don't|never|avoid|not for|should not|must not)\b/i;
/** 평문을 문장 단위로 쪼갠다(마침표·세미콜론·개행). */
const enSentences = (s: string): string[] => s.split(/(?<=[.;!?])\s+/).filter((x) => x.trim() !== '');
/** EN 경로 표현 역전 판정(문장 단위). `--selftest` 가 이 함수의 비공허성을 직접 확인한다. */
function enInversionHits(route: string, enBody: string, officialText: string): Array<{ label: string; sentence: string }> {
  const hits: Array<{ label: string; sentence: string }> = [];
  for (const sent of enSentences(enBody)) {
    for (const [label, re] of EN_FORBIDDEN[route]) {
      if (!re.test(sent)) continue;
      // 공식 원문에 같은 계열 근거가 있고 문장이 부정문이면 충실한 번역 → 면제.
      if (EN_NEGATED.test(sent) && EN_EVIDENCE_KO[label].test(officialText)) continue;
      hits.push({ label, sentence: sent.slice(0, 120) });
    }
  }
  return hits;
}

interface Gate { id: string; gate: string; expected: string; actual: string; pass: boolean; detail?: unknown }
const gates: Gate[] = [];
const G = (id: string, gate: string, expected: string, actual: string, pass: boolean, detail?: unknown): void => {
  gates.push({ id, gate, expected, actual, pass, ...(detail !== undefined ? { detail } : {}) });
};
const inter = (a: Set<string>, b: Set<string>): string[] => [...a].filter((x) => b.has(x));

async function main(): Promise<void> {
  const pool = new Pool({ host: '127.0.0.1', port: PORT, user: 'o4o_api', database: process.env.DB_NAME || 'o4o_platform', max: 1, statement_timeout: 900000 });
  const q = async (t: string, p?: unknown[]): Promise<any[]> => (await pool.query(t, p)).rows;
  try {
    await q('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');

    // ── A. 입력 26 재현 (원장에서 독립 재도출) ─────────────────────────────────────
    const carryRows = (J(CARRYOVER).rows || J(CARRYOVER).masters) as any[];
    const reReq = carryRows.filter((r) => r.classification === 'REQUIRES_ROUTE_PROFILE');
    const reNasal = reReq.filter((r) => r.resolvedRoute === 'nasal').map((r) => r.masterId);
    const reRectal = reReq.filter((r) => r.resolvedRoute === 'rectal').map((r) => r.masterId);
    const reAll = new Set([...reNasal, ...reRectal]);

    const sel = J(SELECTION);
    const masters = sel.masters as any[];
    const ids = masters.map((m) => m.masterId);
    const idSet = new Set(ids);
    const byId = new Map(masters.map((m) => [m.masterId, m]));

    G('IV-01', '입력 26 재현(carry-over REQUIRES_ROUTE_PROFILE ∩ nasal|rectal)', '26 · 집합 일치',
      `원장 재도출 ${reAll.size} / 선정 ${ids.length} / 차집합 ${[...reAll].filter((x) => !idSet.has(x)).length + ids.filter((x) => !reAll.has(x)).length}`,
      reAll.size === 26 && ids.length === 26 && ids.every((x) => reAll.has(x)));
    const nas = masters.filter((m) => m.route === 'nasal').map((m) => m.masterId);
    const rec = masters.filter((m) => m.route === 'rectal').map((m) => m.masterId);
    G('IV-02', 'nasal 14 / rectal 12', 'nasal 14 · rectal 12', `nasal ${nas.length} · rectal ${rec.length}`,
      nas.length === 14 && rec.length === 12);
    G('IV-03', '입력 중복 0', '0', String(ids.length - idSet.size), ids.length === idSet.size);
    const routeDrift = masters.filter((m) => {
      const c = reReq.find((r) => r.masterId === m.masterId);
      return !c || c.resolvedRoute !== m.route;
    }).map((m) => ({ masterId: m.masterId, ledgerRoute: m.route }));
    G('IV-04', 'resolvedRoute drift 0 (route 재판정 없음)', '0', String(routeDrift.length), routeDrift.length === 0, routeDrift.slice(0, 5));
    const unitMismatch = masters.filter((m) => (m.route === 'nasal' ? m.unit !== 'nasal-unit-1' : m.unit !== 'rectal-unit-1'));
    G('IV-05', 'unit 배정 정합(nasal-unit-1 / rectal-unit-1)', '0건 불일치', String(unitMismatch.length), unitMismatch.length === 0);

    // ── B. 오염 대조군 교집합 0 ────────────────────────────────────────────────────
    const withdrawn = new Set<string>((J(WITHDRAWN).rows as any[]).map((r) => r.masterId));
    const priorGreen = new Set<string>();
    for (const f of GREEN_LEDGERS) for (const r of (J(f).rows || [])) if (!r.status || r.status === 'GREEN') priorGreen.add(r.masterId);
    const greenEff = new Set([...priorGreen].filter((x) => !withdrawn.has(x)));
    G('IV-06', `선행 유효 GREEN 누계 3,378`, '3378', String(greenEff.size), greenEff.size === 3378);
    G('IV-07', '선행 GREEN 교집합 0', '0', String(inter(idSet, greenEff).length), inter(idSet, greenEff).length === 0);
    const srcTerm = new Set<string>((J(SRC_TERMINAL).masters as any[]).filter((m) => m.code === 'SOURCE_EFFICACY_MISSING').map((m) => m.mid));
    G('IV-08', `source terminal 24 교집합 0 (모집단 ${srcTerm.size})`, '0', String(inter(idSet, srcTerm).length),
      srcTerm.size === 24 && inter(idSet, srcTerm).length === 0);
    G('IV-09', `기구 멸균제 회수 3 교집합 0 (모집단 ${withdrawn.size})`, '0', String(inter(idSet, withdrawn).length),
      withdrawn.size === 3 && inter(idSet, withdrawn).length === 0);
    const excl = new Set<string>((J(EXCLUDE).masters as any[]).map((m) => m.mid));
    G('IV-10', `exclude 266 교집합 0 (모집단 ${excl.size})`, '0', String(inter(idSet, excl).length),
      excl.size === 266 && inter(idSet, excl).length === 0);

    // ── C. DB 실측 PRE_APPLY 상태 ──────────────────────────────────────────────────
    const state = await q(
      `SELECT m.mid::text mid,
         (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
            AND s.source_type=$2 AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)::int easykocanon,
         (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
            AND s.source_type=ANY($3) AND s.status IN ('canonical','needs_review') AND s.deleted_at IS NULL)::int authoredany,
         (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
            AND s.language='en' AND s.status IN ('canonical','needs_review') AND s.deleted_at IS NULL)::int enany
       FROM unnest($1::uuid[]) m(mid) ORDER BY 1`, [ids, EASY, AUTHORED_ANY]);
    const noEasy = state.filter((r) => r.easykocanon !== 1);
    const hasAuthored = state.filter((r) => r.authoredany !== 0);
    const hasEn = state.filter((r) => r.enany !== 0);
    G('IV-11', '대상 26 easy ko canonical 정확히 1', '0건 위반', String(noEasy.length), noEasy.length === 0, noEasy.slice(0, 5));
    G('IV-12', '기존 authored KO·EN canonical 0 (점유 없음)', '0건', `authored ${hasAuthored.length} / en ${hasEn.length}`,
      hasAuthored.length === 0 && hasEn.length === 0, { authored: hasAuthored.slice(0, 5), en: hasEn.slice(0, 5) });
    const dup = await q(
      `SELECT master_id::text mid, COALESCE(language,'ko') lang, count(*)::int n
         FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
        GROUP BY 1,2 HAVING count(*) > 1`, [ids]);
    G('IV-13', 'canonicalDup 0', '0', String(dup.length), dup.length === 0, dup.slice(0, 5));

    // sourceRef — 독자 산식 재계산 · 결정론 · 내부 중복 0 · LIVE 점유 0
    const refs = ids.map(refOf);
    const refMismatch = masters.filter((m) => refOf(m.masterId) !== m.sourceRef).map((m) => m.masterId);
    G('IV-14', 'sourceRef 독자 재계산 일치(결정론)', '0건 불일치', String(refMismatch.length), refMismatch.length === 0, refMismatch.slice(0, 5));
    G('IV-15', 'sourceRef 내부 중복 0', '26 distinct', `${new Set(refs).size} distinct`, new Set(refs).size === 26);
    const refOcc = await q(
      `SELECT source_ref_id::text ref, count(*)::int n FROM shared_product_descriptions
        WHERE source_ref_id = ANY($1::uuid[]) AND deleted_at IS NULL GROUP BY 1`, [refs]);
    G('IV-16', 'sourceRef LIVE 점유 0 (V2/V3/V4 충돌 없음)', '0', String(refOcc.length), refOcc.length === 0, refOcc.slice(0, 5));

    // 공식 원문 hash drift 0 — DB 재조회 + 독자 파서
    const easyRows = await q(
      `SELECT pop.id mid, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
        JOIN LATERAL (
          SELECT content FROM shared_product_descriptions s
           WHERE s.master_id=pop.id::uuid AND s.source_type=$2 AND s.description_type='STORE'
             AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
           ORDER BY length(s.content) DESC LIMIT 1) es ON true`, [ids, EASY]);
    const official = new Map<string, Record<string, string>>();
    const srcDrift: any[] = [], secDrift: any[] = [];
    for (const r of easyRows) {
      const sec = officialSections(r.content);
      official.set(r.mid, sec);
      const m = byId.get(r.mid);
      if (!m) continue;
      if (md5(r.content) !== m.officialSourceHash) srcDrift.push({ masterId: r.mid });
      for (const k of SECTIONS) {
        const h = sec[k] ? md5(sec[k]) : '';
        if (h !== (m.officialSectionHash?.[k] ?? '')) secDrift.push({ masterId: r.mid, section: k });
      }
    }
    G('IV-17', '공식 원문 hash drift 0 (전체)', '0', String(srcDrift.length), srcDrift.length === 0 && easyRows.length === 26, srcDrift.slice(0, 5));
    G('IV-18', '공식 6섹션 hash drift 0 (독자 파서 재파싱)', '0', String(secDrift.length), secDrift.length === 0, secDrift.slice(0, 8));

    // 전문의약품 혼입 0
    const etcMix = masters.filter((m) => (m.classKinds || []).some((k: string) => /전문/.test(k)));
    G('IV-19', '전문의약품 혼입 0', '0', String(etcMix.length), etcMix.length === 0, etcMix.slice(0, 5).map((m: any) => m.masterId));

    // ── D. 산출물(KO/EN payload) 품질 — LIVE 가 없으므로 payload 를 실측 대상으로 삼는다 ──
    const ko = J(KO_PAYLOAD).payloads as any[];
    const en = J(EN_PAYLOAD).payloads as any[];
    const koBy = new Map(ko.map((p) => [p.masterId, p]));
    const enBy = new Map(en.map((p) => [p.masterId, p]));
    G('IV-20', 'KO·EN payload 26/26 · 대상 집합 일치', 'KO 26 · EN 26 · 차집합 0',
      `KO ${ko.length} · EN ${en.length} · 차집합 ${ids.filter((i) => !koBy.has(i) || !enBy.has(i)).length}`,
      ko.length === 26 && en.length === 26 && ids.every((i) => koBy.has(i) && enBy.has(i)));
    const hashBad = [...ko.filter((p) => md5(p.content) !== p.contentHash).map((p) => ({ lang: 'ko', masterId: p.masterId })),
      ...en.filter((p) => md5(p.content) !== p.contentHash).map((p) => ({ lang: 'en', masterId: p.masterId }))];
    G('IV-21', 'payload contentHash 독자 재계산 일치', '0건 불일치', String(hashBad.length), hashBad.length === 0, hashBad.slice(0, 5));

    const secMiss: any[] = [], numMiss: any[] = [], ageMiss: any[] = [], durMiss: any[] = [];
    const koInv: any[] = [], koLost: any[] = [], enInv: any[] = [], enHan: any[] = [], enNewNum: any[] = [];
    const cov: number[] = [];
    for (const id of ids) {
      const m = byId.get(id)!;
      const off = official.get(id) || {};
      const present = SECTIONS.filter((k) => (off[k] || '').trim() !== '');
      const body = plain(koBy.get(id)!.content);
      const nbody = verbNorm(body);
      const worst: any[] = [];
      for (const k of present) {
        const toks = [...new Set((verbNorm(plain(off[k])).match(/[가-힣]{2,}/g) || []))];
        if (!toks.length) continue;
        const miss = toks.filter((t) => !nbody.includes(t));
        const c = (toks.length - miss.length) / toks.length;
        cov.push(c);
        if (c < SECTION_COVERAGE_MIN) worst.push({ sec: k, cov: +c.toFixed(4), missing: miss.slice(0, 8) });
      }
      if (worst.length) secMiss.push({ masterId: id, sections: worst });

      const offAll = present.map((k) => plain(off[k])).join(' ');
      const mn = [...new Set(nums(offAll))].filter((x) => !nums(body).includes(x));
      if (mn.length) numMiss.push({ masterId: id, missing: mn.slice(0, 12) });
      const ma = norm(ageTokens(offAll)).filter((x) => !norm(ageTokens(body)).includes(x));
      if (ma.length) ageMiss.push({ masterId: id, missing: ma.slice(0, 8) });
      const md = norm(durTokens(offAll)).filter((x) => !norm(durTokens(body)).includes(x));
      if (md.length) durMiss.push({ masterId: id, missing: md.slice(0, 8) });

      // route 표현 역전 — 공식 원문에 근거가 없는데 저작본에만 나타나는 타 경로 표현만 잡는다.
      const offRaw = SECTIONS.map((k) => plain(off[k] || '')).join(' ');
      for (const [label, re] of KO_FORBIDDEN[m.route]) {
        if (re.test(body) && !re.test(offRaw)) koInv.push({ masterId: id, route: m.route, label });
      }
      if (!KO_OWN[m.route].test(body)) koLost.push({ masterId: id, route: m.route });

      const ebody = plain(enBy.get(id)!.content);
      for (const h of enInversionHits(m.route, ebody, offRaw)) enInv.push({ masterId: id, route: m.route, ...h });
      if (/[가-힣]/.test(ebody)) enHan.push({ masterId: id });
      // 허가번호(자기 master 의 공식 식별자)는 의료 사실이 아니므로 신규 수치 판정에서 제외한다.
      const own = new Set(nums(String(m.permitCode || '')));
      const added = [...new Set(nums(ebody))].filter((x) => !nums(offAll).includes(x) && !nums(body).includes(x) && !own.has(x));
      if (added.length) enNewNum.push({ masterId: id, added: added.slice(0, 8) });
    }
    cov.sort((a, b) => a - b);
    const covStat = cov.length ? { min: +cov[0].toFixed(4), p01: +cov[Math.floor(cov.length * 0.01)].toFixed(4), median: +cov[Math.floor(cov.length / 2)].toFixed(4), sections: cov.length } : null;
    G('IV-22', `공식 섹션 내용 보존(토큰 커버리지 ≥ ${SECTION_COVERAGE_MIN})`, '미달 0', `${secMiss.length}개 master 미달`,
      secMiss.length === 0, { coverage: covStat, worst: secMiss.slice(0, 5) });
    G('IV-23', '수치 누락 0', '0', String(numMiss.length), numMiss.length === 0, numMiss.slice(0, 5));
    G('IV-24', '연령 토큰 누락 0', '0', String(ageMiss.length), ageMiss.length === 0, ageMiss.slice(0, 5));
    G('IV-25', '기간·횟수 토큰 누락 0', '0', String(durMiss.length), durMiss.length === 0, durMiss.slice(0, 5));
    G('IV-26', 'KO route 표현 역전 0 (§6·§7 금지 계열)', '0', String(koInv.length), koInv.length === 0, koInv.slice(0, 8));
    G('IV-27', 'KO 자기 경로 표현 보존(비강/직장)', '0건 소실', String(koLost.length), koLost.length === 0, koLost.slice(0, 5));
    G('IV-28', 'EN route 표현 역전 0', '0', String(enInv.length), enInv.length === 0, enInv.slice(0, 8));
    G('IV-29', 'EN 한글 잔존 0', '0', String(enHan.length), enHan.length === 0, enHan.slice(0, 5));
    G('IV-30', 'EN 신규 수치(원문·KO 밖) 0', '0', String(enNewNum.length), enNewNum.length === 0, enNewNum.slice(0, 5));

    // 타 master 원문 혼입 0 — 자기 permitCode 만 등장해야 한다.
    const otherCodes = masters.map((m) => m.permitCode).filter(Boolean);
    const mix = ids.filter((id) => {
      const m = byId.get(id)!;
      const t = koBy.get(id)!.content + ' ' + enBy.get(id)!.content;
      return otherCodes.some((c: string) => c !== m.permitCode && t.includes(c));
    });
    G('IV-31', '타 master 원문·식별자 혼입 0', '0', String(mix.length), mix.length === 0, mix.slice(0, 5));

    // ── E. dry-run · rollback-test 재판정 ──────────────────────────────────────────
    const units = [{ u: 'nasal-unit-1', n: 14 }, { u: 'rectal-unit-1', n: 12 }];
    const dryDigest: Record<string, string> = {};
    let dryBad = 0, rbBad = 0, txTotal = 0, committedTotal = 0;
    const rbDetail: any[] = [];
    for (const { u, n } of units) {
      const d = J(DRY(u));
      const planRaw = fs.readFileSync(DRY_PLAN(u), 'utf8');
      const digest = sha(planRaw);
      dryDigest[u] = digest;
      const ok = d.summary.dryRunPass === n && d.summary.committedWriteActual === 0 && d.summary.liveDbWrite === 0
        && d.summary.planDigest === digest && d.results.length === n;
      if (!ok) dryBad++;
      const r = J(RB(u));
      const resOk = r.results.every((x: any) => x.status === 'ROLLBACK_TEST_PASS' && x.committed === false && x.residueClean === true && x.writeActual === 0);
      const rok = r.summary.rollbackTestPass === n && r.summary.committedWriteActual === 0 && r.summary.residueDirty === 0 && resOk;
      if (!rok) rbBad++;
      txTotal += r.summary.txWrittenThenRolledBack;
      committedTotal += d.summary.committedWriteActual + r.summary.committedWriteActual;
      rbDetail.push({ unit: u, target: n, txWrittenThenRolledBack: r.summary.txWrittenThenRolledBack, committed: r.summary.committedWriteActual });
    }
    G('IV-32', 'dry-run plan digest 독자 재계산 일치(재현성)', '0건 불일치', String(dryBad), dryBad === 0, dryDigest);
    G('IV-33', 'rollback-test 26/26 PASS · residue 0', '0건 위반', String(rbBad), rbBad === 0, rbDetail);
    G('IV-34', 'rollback TX 내부 write = 26 × 6', '156', String(txTotal), txTotal === 156);

    // rollback 잔여 — 산출기 보고가 아니라 지금 이 커넥션에서 다시 본다.
    const residue = (await q(
      `SELECT
         (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id = ANY($1::uuid[])
            AND description_type='STORE' AND source_type=ANY($2) AND deleted_at IS NULL) authored,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id = ANY($1::uuid[])
            AND description_type='STORE' AND language='en' AND deleted_at IS NULL) en,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE source_ref_id = ANY($3::uuid[])) refany,
         (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE (metadata->>'batchId')=$4) auditbatch,
         (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE master_id = ANY($1::uuid[])
            AND (metadata->>'wo')=$5) auditwo`,
      [ids, AUTHORED_ANY, refs, BATCH, WO]))[0];
    G('IV-35', 'rollback 잔여 0 (독립 커넥션 재확인)', 'authored 0 · en 0 · ref 0 · audit 0',
      `authored ${residue.authored} · en ${residue.en} · ref ${residue.refany} · auditBatch ${residue.auditbatch} · auditWo ${residue.auditwo}`,
      residue.authored === 0 && residue.en === 0 && residue.refany === 0 && residue.auditbatch === 0 && residue.auditwo === 0);
    G('IV-36', 'LIVE DB write(커밋) 0', '0', String(committedTotal), committedTotal === 0);

    // 대상 밖 audit 0 — 본 batch 로 기록된 audit 이 전역에 하나도 없어야 한다(=대상 밖도 자동 0).
    const outsideAudit = (await q(
      `SELECT count(*)::int n FROM shared_product_description_audit_logs
        WHERE (metadata->>'batchId')=$1 AND master_id <> ALL($2::uuid[])`, [BATCH, ids]))[0].n;
    G('IV-37', '대상 밖 audit 0', '0', String(outsideAudit), outsideAudit === 0);

    // 대조군 write 0 — source terminal 24 / 기구 멸균제 3 / exclude 266
    for (const [id, label, set] of [['IV-38', 'source terminal 24', srcTerm], ['IV-39', '기구 멸균제 3', withdrawn], ['IV-40', 'exclude 266', excl]] as Array<[string, string, Set<string>]>) {
      /**
       * 판정 대상은 **본 배치가 대조군에 쓴 것**이다. 대조군 자기 sourceRef 로 조회하면
       * 선행 배치(route535 등)의 정상 산출물까지 세어 오탐이 난다 → 본 배치 26 ref 로만 본다.
       */
      const arr = [...set];
      const w = (await q(
        `SELECT
           (SELECT count(*)::int FROM shared_product_descriptions WHERE master_id = ANY($1::uuid[])
              AND source_ref_id = ANY($2::uuid[])) refhit,
           (SELECT count(*)::int FROM shared_product_description_audit_logs WHERE master_id = ANY($1::uuid[])
              AND (metadata->>'batchId')=$3) auditn`, [arr, refs, BATCH]))[0];
      G(id, `${label} 본 배치 write 0`, '0', `ref ${w.refhit} · audit ${w.auditn}`, w.refhit === 0 && w.auditn === 0);
    }

    // ── F. 선행 GREEN 3,378 불변 — 원장 기록 hash 와 DB 실측 md5 대조 ────────────────
    const greenRows: Array<{ masterId: string; koContentHash: string; enContentHash: string }> = [];
    for (const f of GREEN_LEDGERS) for (const r of (J(f).rows || [])) {
      if ((!r.status || r.status === 'GREEN') && !withdrawn.has(r.masterId)) greenRows.push(r);
    }
    const gIds = greenRows.map((r) => r.masterId);
    const gBy = new Map(greenRows.map((r) => [r.masterId, r]));
    const liveHash = await q(
      `SELECT master_id::text mid, COALESCE(language,'ko') lang, md5(content) h
         FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
          AND source_type=$2 AND deleted_at IS NULL`, [gIds, AUTHORED_V4]);
    const seen = new Map<string, { ko?: string; en?: string }>();
    for (const r of liveHash) {
      const e = seen.get(r.mid) || {};
      if (r.lang === 'en') e.en = r.h; else e.ko = r.h;
      seen.set(r.mid, e);
    }
    const changed: any[] = [], missing: any[] = [];
    for (const id of gIds) {
      const cur = seen.get(id);
      const exp = gBy.get(id)!;
      if (!cur || !cur.ko || !cur.en) { missing.push({ masterId: id }); continue; }
      if (cur.ko !== exp.koContentHash || cur.en !== exp.enContentHash) changed.push({ masterId: id });
    }
    G('IV-41', '선행 유효 GREEN 3,378 불변(KO·EN content md5 대조)', '변경 0 · 소실 0',
      `변경 ${changed.length} / 소실 ${missing.length} / 대상 ${gIds.length}`,
      changed.length === 0 && missing.length === 0 && gIds.length === 3378, { changed: changed.slice(0, 5), missing: missing.slice(0, 5) });

    // ── G. LIVE apply 잠금 상태 ────────────────────────────────────────────────────
    // env 이름 상수는 계약 파일에, 잠금 분기는 실행기에 있다. 두 파일을 모두 실측한다.
    const S = (f: string): string => fs.readFileSync(path.resolve(process.cwd(), 'src/scripts', f), 'utf8');
    const execSrc = S('otc-v4-nr26-executor.ga.ts');
    const cSrc = S('otc-v4-nr26-contract.ga.ts');
    const locked = /'OTC_V4_APPLY_NR26'/.test(cSrc) && /'OTC_V4_NR26_APPROVAL_WO'/.test(cSrc)
      && /CONFIRM_ENV_NR/.test(execSrc) && /APPROVAL_WO_ENV_NR/.test(execSrc) && /LOCKED:/.test(execSrc)
      && /process\.exit\(3\)/.test(execSrc);
    G('IV-42', 'LIVE apply 이중 게이트 잠금 존재(env 2개 동시 충족 필요)', 'locked', locked ? 'locked' : 'unlocked', locked);
    const envOpen = process.env.OTC_V4_APPLY_NR26 === 'CONFIRM' && !!(process.env.OTC_V4_NR26_APPROVAL_WO || '').trim();
    G('IV-43', '현재 세션 LIVE 잠금 해제 안 됨', 'closed', envOpen ? 'OPEN' : 'closed', !envOpen);

    await q('COMMIT');

    const pass = gates.every((g) => g.pass);
    const out = {
      wo: WO, agent: 'ga', kind: 'independent-verification', batchId: BATCH, mode: 'PRE_APPLY',
      verifiedAt: new Date().toISOString(), port: PORT,
      target: 26, byRoute: { nasal: nas.length, rectal: rec.length },
      liveDbWriteCommitted: 0,
      total: gates.length, passed: gates.filter((g) => g.pass).length, failed: gates.filter((g) => !g.pass).length,
      pass, gates,
    };
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
    console.log(JSON.stringify({ total: out.total, passed: out.passed, failed: out.failed, pass, out: path.basename(OUT) }, null, 2));
    if (!pass) console.log(JSON.stringify(gates.filter((g) => !g.pass), null, 2));
  } finally {
    await pool.end();
  }
}
/**
 * 면제 규칙(부정문 + 공식 근거)이 게이트를 무력화하지 않았는지 확인하는 negative control.
 * DB 접속 없음. 기대와 다르면 exit 1.
 */
function selftest(): void {
  const OFF_RECTAL = '이 약은 직장에만 사용하고 내복용으로는 사용하지 마십시오. 1회 1개를 직장내에 삽입합니다.';
  const OFF_NASAL = '각각의 콧구멍에 1회씩 뿌립니다. 이 약은 점비용으로만 사용하십시오.';
  const cases: Array<[string, string, string, string, number]> = [
    ['rectal 경구 긍정 오도입', 'rectal', 'Take this medicine orally after meals.', OFF_RECTAL, 1],
    ['rectal 경구 금지(공식 근거 있음)', 'rectal', 'Use this medicine only in the rectum and do not use it orally.', OFF_RECTAL, 0],
    ['rectal 질내 오도입', 'rectal', 'Insert 1 piece into the vagina.', OFF_RECTAL, 1],
    ['rectal 정상', 'rectal', 'Insert 1 suppository into the rectum at a time.', OFF_RECTAL, 0],
    ['nasal 점안 오도입', 'nasal', 'Instil 1 drop into each eye.', OFF_NASAL, 1],
    ['nasal 정상', 'nasal', 'Spray once into each nostril.', OFF_NASAL, 0],
    ['공식 근거 없는 부정문은 면제 안 됨', 'nasal', 'Do not instil it into the eye.', OFF_NASAL, 1],
  ];
  let bad = 0;
  for (const [note, route, en, off, expect] of cases) {
    const n = enInversionHits(route, en, off).length;
    const ok = (expect === 0 ? n === 0 : n >= 1);
    if (!ok) bad++;
    console.log(JSON.stringify({ note, expect: expect === 0 ? 'pass' : 'reject', hits: n, ok }));
  }
  console.log(JSON.stringify({ selftest: bad === 0 ? 'PASS' : 'FAIL', bad }));
  if (bad) process.exit(1);
}

if (process.argv.includes('--selftest')) selftest();
else main().catch((e) => { console.error(e); process.exit(1); });
