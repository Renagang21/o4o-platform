/**
 * WO-O4O-OTC-EASY-DRUG-V4-ROUTE-EXCEPTION-673-BULK-RESOLUTION-V1
 *   — route 673 판정 독립검증기 (READ-ONLY)
 *
 * ⚠️ 독립성 계약: 판정기(otc-v4-route-resolution-673.na.ts)의 어떤 함수도 import 하지 않는다.
 *    섹션 파서 · 부위 어휘 · ATC 매핑 · 검증 SQL 을 이 파일에서 독자적으로 재구현하고,
 *    판정기가 주장한 route 를 **공식 원문 실측으로 재판정**해 대조한다.
 *
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-v4-route-673-independent-verify.na.ts --port 5506
 */
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const WO = 'WO-O4O-OTC-EASY-DRUG-V4-ROUTE-EXCEPTION-673-BULK-RESOLUTION-V1';
const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => parseInt(arg('--port') || '5506', 10);
const OUT = P('otc-v4-route-673-independent-verification.na.json');

// ── 독자 구현: 섹션 파싱(판정기와 다른 경로 — 태그 사이 텍스트를 직접 자름) ──────────
function sectionsOf(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = html.split(/<p><strong>/).slice(1);
  for (const p of parts) {
    const i = p.indexOf('</strong>');
    if (i < 0) continue;
    const title = p.slice(0, i).trim();
    const body = p.slice(i + 9).replace(/^<br\/?>/, '').replace(/<\/p>[\s\S]*$/, '');
    out[title] = body;
  }
  return out;
}
const flat = (s: string): string => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

/** 독자 부위 어휘 — 판정기와 표현을 겹치지 않게 다시 씀. */
const MARK: Record<string, RegExp> = {
  topical: /도포|바르|발라|붙|부착|환부|피부|문지|씻|닦|소독|분무|뿌|살포|첩부|밴드|거즈|드레싱|찜질/,
  ophthalmic: /점안|결막|안구|눈/,
  oromucosal: /구강|입안|입 안|가글|양치|함수|트로키|설하|잇몸|치은|구내|인후|목구멍/,
  nasal: /비강|코에|코 안|콧|점비/,
  otic: /귀에|귓|이도|외이|점이/,
  vaginal: /질내|질 내|질에|질강|질좌/,
  rectal: /항문|직장|좌약|관장|치핵|치열|치질/,
  inhalation: /흡입|네뷸/,
  oral: /복용|삼키|먹|마시|섭취|경구/,
};
const hits = (t: string): string[] => Object.keys(MARK).filter((k) => MARK[k].test(t));

/** 독자 ATC 매핑 — 1자리 해부학 그룹 위주로 다시 씀. */
function atcGroup(atc: string | null): string | null {
  if (!atc) return null;
  const a = atc.toUpperCase();
  if (a.startsWith('D')) return 'topical';
  if (a.startsWith('M02')) return 'topical';
  if (a.startsWith('S01')) return 'ophthalmic';
  if (a.startsWith('S02')) return 'otic';
  if (a.startsWith('R01')) return 'nasal';
  if (a.startsWith('R02') || a.startsWith('A01')) return 'oromucosal';
  if (a.startsWith('R03')) return 'inhalation';
  if (a.startsWith('G01')) return 'vaginal';
  return null;
}

interface Gate { id: string; gate: string; expected: string; actual: string; pass: boolean; detail?: unknown }
const gates: Gate[] = [];
const G = (id: string, gate: string, expected: string, actual: string, pass: boolean, detail?: unknown): void => {
  gates.push({ id, gate, expected, actual, pass, ...(detail !== undefined ? { detail } : {}) });
};

async function main(): Promise<void> {
  const led = J('otc-v4-route-673-resolution-ledger.na.json');
  const rows: any[] = led.rows;
  const ga = J('otc-v4-route-673-agent-ga-reentry.na.json');
  const hold = J('otc-v4-route-673-hold-ledger.na.json');
  const con = J('otc-v4-exception-consolidated-na.ga.json');

  // ── A. 집합 정합 ───────────────────────────────────────────────────────────
  G('RV-01', '입력 673', '673', String(rows.length), rows.length === 673);
  const ids = rows.map((r) => r.masterId);
  G('RV-02', 'master 중복 0', '0', String(ids.length - new Set(ids).size), new Set(ids).size === ids.length);
  const classSum = Object.values(led.byClassification as Record<string, number>).reduce((a, b) => a + b, 0);
  G('RV-03', '분류 합계 = 673', '673', String(classSum), classSum === 673);
  const expectIds = new Set<string>([
    ...con.rows.filter((r: any) => r.group === 'route').map((r: any) => r.masterId),
    ...con.selectionExcluded.filter((r: any) => r.group === 'route').map((r: any) => r.masterId),
  ]);
  const missing = [...expectIds].filter((x) => !ids.includes(x));
  G('RV-04', '인계 원장 route 대상과 동일 집합', '누락 0', String(missing.length), missing.length === 0, missing.slice(0, 5));

  // ── B. 혼입 금지 ───────────────────────────────────────────────────────────
  const green = new Set<string>([
    ...J('otc-v4-pilot-100-green-ledger.ga.json').rows.map((r: any) => r.masterId),
    ...J('otc-v4-pilot-500-green-ledger.apply-run1.ga.json').rows.map((r: any) => r.masterId),
    ...J('otc-v4-next2000-green-ledger.run-20260729T154307.ga.json').rows.map((r: any) => r.masterId),
    ...J('otc-v4-finalall-green-ledger.ga.json').rows.map((r: any) => r.masterId),
  ]);
  const src24 = new Set<string>(con.rows.filter((r: any) => r.group === 'source').map((r: any) => r.masterId));
  const ex266 = new Set<string>(J('otc-easy-drug-remaining-3809-exclude-ledger-v1.json').masters.map((m: any) => m.mid));
  G('RV-05', '기존 GREEN 혼입 0', '0', String(ids.filter((x) => green.has(x)).length), !ids.some((x) => green.has(x)));
  G('RV-06', 'source terminal 24 혼입 0', '0', String(ids.filter((x) => src24.has(x)).length), !ids.some((x) => src24.has(x)));
  G('RV-07', 'exclude 266 혼입 0', '0', String(ids.filter((x) => ex266.has(x)).length), !ids.some((x) => ex266.has(x)));

  // ── C. 산출물 정합 ─────────────────────────────────────────────────────────
  const recov = rows.filter((r) => r.classification === 'RECOVERABLE_ROUTE_CONFIRMED');
  G('RV-08', 'agent-ga 재투입 원장 = RECOVERABLE 수', String(recov.length), String(ga.total),
    ga.total === recov.length && ga.masters.length === recov.length);
  const holdClasses = ['HOLD_UNRESOLVED', 'ROUTE_SOURCE_CONFLICT', 'TRUE_MULTI_ROUTE', 'REQUIRES_ROUTE_PROFILE', 'EXCLUDE_CONFIRMED'];
  const holdExpect = rows.filter((r) => holdClasses.includes(r.classification)).length;
  G('RV-09', 'HOLD 원장 = 비-RECOVERABLE 수', String(holdExpect), String(hold.total), hold.total === holdExpect);
  G('RV-10', 'RECOVERABLE 은 전부 composer 지원 route', '위반 0',
    String(recov.filter((r) => !r.composerSupported).length), recov.every((r) => r.composerSupported));
  G('RV-11', 'REQUIRES_ROUTE_PROFILE 은 전부 미지원 route', '위반 0',
    String(rows.filter((r) => r.classification === 'REQUIRES_ROUTE_PROFILE' && r.composerSupported).length),
    !rows.some((r) => r.classification === 'REQUIRES_ROUTE_PROFILE' && r.composerSupported));
  G('RV-12', '제품명 단독 확정 0', 'productNameUsedInDecision 전건 false',
    String(rows.filter((r) => r.productNameUsedInDecision !== false).length),
    rows.every((r) => r.productNameUsedInDecision === false));
  G('RV-13', '근거 없는 route 확정 0', '위반 0',
    String(recov.filter((r) => !r.decisionBasis || !r.decisionDetail).length),
    recov.every((r) => r.decisionBasis && r.decisionDetail));
  G('RV-14', 'TRUE_MULTI_ROUTE 는 route 강제 병합 0', 'resolvedRoute 전건 null',
    String(rows.filter((r) => r.classification === 'TRUE_MULTI_ROUTE' && r.resolvedRoute).length),
    !rows.some((r) => r.classification === 'TRUE_MULTI_ROUTE' && r.resolvedRoute));
  G('RV-15', 'ROUTE_SOURCE_CONFLICT 는 임의 선택 0', 'resolvedRoute 전건 null',
    String(rows.filter((r) => r.classification === 'ROUTE_SOURCE_CONFLICT' && r.resolvedRoute).length),
    !rows.some((r) => r.classification === 'ROUTE_SOURCE_CONFLICT' && r.resolvedRoute));

  // ── D. DB 실측 재판정 (독자 어휘·독자 파서) ─────────────────────────────────
  const pool = new Pool({ host: '127.0.0.1', port: port(), user: 'o4o_api', database: 'o4o_platform', max: 1 });
  let dbGates = 0;
  try {
    await pool.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const ro = (await pool.query(`SELECT current_setting('transaction_read_only') ro`)).rows[0].ro;
    G('RV-16', 'READ ONLY 트랜잭션 실측', 'on', String(ro), ro === 'on');

    const easy = (await pool.query(`
      SELECT master_id::text mid, content FROM shared_product_descriptions
       WHERE master_id = ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE'
         AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`, [ids])).rows;
    const easyBy = new Map<string, string>();
    for (const r of easy as any[]) if (!easyBy.has(r.mid) || (r.content || '').length > (easyBy.get(r.mid) || '').length) easyBy.set(r.mid, r.content);

    const atcRows = (await pool.query(`
      SELECT pi.product_master_id::text mid,
             array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'국제표준코드(ATC코드)','')), NULL) atcs,
             array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'전문일반구분','')), NULL) kinds
        FROM product_identifiers pi
        JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
         AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
       WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL AND pi.product_master_id = ANY($1::uuid[])
       GROUP BY 1`, [ids])).rows;
    const atcBy = new Map(atcRows.map((r: any) => [r.mid, r]));

    // D-1. RECOVERABLE 의 주장 route 가 공식 원문에서 독자 어휘로도 지지되는가
    const unsupported: any[] = [];
    const noOfficial: any[] = [];
    for (const r of recov) {
      const c = easyBy.get(r.masterId);
      if (!c) { noOfficial.push(r.masterId); continue; }
      const sec = sectionsOf(c);
      const dosage = flat(sec['용법·용량'] || '');
      const effect = flat(sec['효능·효과'] || '');
      const all = flat(c);
      const claimed = r.resolvedRoute as string;
      const supportedBy: string[] = [];
      if (hits(dosage).includes(claimed)) supportedBy.push('용법');
      if (hits(effect).includes(claimed)) supportedBy.push('효능');
      if (hits(all).includes(claimed)) supportedBy.push('본문전체');
      const g = atcGroup((atcBy.get(r.masterId) as any)?.atcs?.[0] ?? null);
      if (g === claimed) supportedBy.push('ATC');
      if (!supportedBy.length) unsupported.push({ masterId: r.masterId, claimed, dosageHits: hits(dosage), atc: g });
    }
    G('RV-17', 'RECOVERABLE route 가 독자 어휘 실측으로 지지됨', '미지지 0', String(unsupported.length),
      unsupported.length === 0, unsupported.slice(0, 8));
    G('RV-18', 'RECOVERABLE 전건 공식 원문 존재', '부재 0', String(noOfficial.length), noOfficial.length === 0, noOfficial.slice(0, 5));

    // D-2. 전문의약품이 RECOVERABLE 에 섞이지 않았는가
    const rxIn = recov.filter((r) => ((atcBy.get(r.masterId) as any)?.kinds ?? []).some((k: string) => k.includes('전문')));
    G('RV-19', 'RECOVERABLE 에 전문의약품 혼입 0', '0', String(rxIn.length), rxIn.length === 0, rxIn.slice(0, 5).map((r) => r.masterId));

    // D-3. RECOVERABLE 이 아직 미완료 상태인가(이미 authored canonical 이면 대상 밖)
    const done = (await pool.query(`
      SELECT count(*)::int n FROM shared_product_descriptions
       WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
         AND source_type='mfds_drug_otc' AND deleted_at IS NULL`, [recov.map((r) => r.masterId)])).rows[0].n;
    G('RV-20', 'RECOVERABLE 은 아직 authored canonical 미보유', '0', String(done), done === 0);

    await pool.query('COMMIT');
    dbGates = 5;
  } finally { await pool.end(); }

  const pass = gates.every((g) => g.pass);
  const out = {
    wo: WO, kind: 'independent-verification', agent: 'na', verifiedAt: new Date().toISOString(),
    independence: '판정기 미import · 별개 섹션 파서 · 별개 부위 어휘 · 별개 ATC 매핑 · 별개 검증 SQL',
    liveDbWrite: 0, dbGates,
    counts: { input: rows.length, byClassification: led.byClassification, recoverable: recov.length, hold: hold.total },
    gatesTotal: gates.length, gatesPassed: gates.filter((g) => g.pass).length, verdict: pass ? 'PASS' : 'FAIL',
    gates,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ...out, gates: gates.map((g) => ({ id: g.id, pass: g.pass, gate: g.gate, actual: g.actual })) }, null, 2));
  if (!pass) process.exitCode = 2;
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
