/**
 * WO-O4O-DRUG-OTC-KO-GREEN-TO-EN-COVERAGE-AUDIT-V1
 *   — KO STORE canonical 기준 EN 커버리지 조사 (READ-ONLY, DB write 0)
 *
 * ⚠️ 모집단 정정(핵심): 기존 "유효 GREEN 3,476" 정의에는 **EN canonical 1 조건이 포함**돼 있어
 *    그대로 KO 모집단으로 쓰면 EN_MISSING/NEEDS_REVIEW/DRAFT_ONLY 가 구조적으로 0 이 되는 순환 조건이다.
 *    → 여기서는 V4 공식 대상(3,809)에서 terminal/exclude 를 뺀 뒤,
 *      **영어의 존재·상태·canonical 여부를 조건에 넣지 않고** KO STORE canonical 보유 master 를 재구성한다.
 *
 * 분류(상호배타): A EN_CANONICAL_CURRENT / B EN_NEEDS_REVIEW / D EN_STALE
 *                E EN_INCOMPLETE_OR_INVALID / F EN_MISSING
 *   C EN_DRAFT_ONLY 는 파일 자산 스캔이 필요하므로 본 패스에서 판정하지 않고 F 내 하위표시로 남긴다(정직 표기).
 *
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-en-coverage-audit.ga.ts --port 5520
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, connect, masterRefV4 } from './otc-v4-master-leaflet-contract.ga.js';

const P = (f: string): string => path.join(DATA_DIR, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const HEAD = arg('--head') || 'unknown';
const AUTHORED = 'mfds_drug_otc';

async function main(): Promise<void> {
  // ── 1. V4 공식 대상 3,809 (agent-la 확립 원장 재사용, 재도출 금지) ──────────────
  const ga = J('otc-easy-drug-remaining-3809-agent-ga-ready-queue-v1.json').masters.map((m: any) => m.mid);
  const na = J('otc-easy-drug-remaining-3809-agent-na-exception-queue-v1.json').masters.map((m: any) => m.mid);
  const ex = J('otc-easy-drug-remaining-3809-exclude-ledger-v1.json').masters.map((m: any) => m.mid);
  const official = [...new Set([...ga, ...na, ...ex])];

  // ── 2. terminal / exclude ──────────────────────────────────────────────────
  const con = J('otc-v4-exception-consolidated-na.ga.json');
  const src24 = con.rows.filter((r: any) => r.group === 'source').map((r: any) => r.masterId);
  const term112 = (() => { const t = J('otc-v4-carryover112-terminal-ledger.ga.json'); return (t.masters || t.rows || []).map((r: any) => r.masterId); })();
  const termExcl = new Set<string>([...ex, ...src24, ...term112]);

  // ── 3. KO 모집단 — **영어 조건 일절 미사용** ────────────────────────────────
  const candidates = official.filter((m) => !termExcl.has(m));
  const db = await connect();
  const stop: string[] = [];
  try {
    const koRows = await db.query(
      `SELECT master_id::text mid, count(*)::int n, min(source_ref_id::text) ref, min(md5(content)) h
         FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
          AND COALESCE(language,'ko')='ko' AND source_type=$2 AND deleted_at IS NULL
        GROUP BY 1`, [candidates, AUTHORED]);
    const koBy = new Map(koRows.map((r: any) => [r.mid, r]));
    const koDup = koRows.filter((r: any) => r.n > 1);
    if (koDup.length) stop.push(`KO canonical 중복 ${koDup.length}건`);
    const koPop = koRows.map((r: any) => r.mid).sort();

    // ── 4. EN 상태 실측 ───────────────────────────────────────────────────────
    const enRows = await db.query(
      `SELECT master_id::text mid, status, source_ref_id::text ref, length(content) len,
              (content ~ '[가-힣]') hangul, (content LIKE '%sd-%') sd,
              (content ~* '\\m(take|takes|taken|taking|swallow|orally|by mouth)\\M') oralverb,
              md5(content) h
         FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND language='en'
          AND deleted_at IS NULL AND status IN ('canonical','needs_review')`, [koPop]);
    const enBy = new Map<string, any[]>();
    for (const r of enRows as any[]) { const a = enBy.get(r.mid) || []; a.push(r); enBy.set(r.mid, a); }

    // route (V4 prep 계열 원장에서 수집 — 없으면 unknown)
    const routeBy = new Map<string, string>();
    for (const f of ['otc-v4-carryover72-prep.ga.json', 'otc-v4-finalall-prep.ga.json', 'otc-v4-next2000-prep.ga.json', 'otc-v4-pilot-500-prep.ga.json', 'otc-v4-pilot-100-prep.ga.json']) {
      try { for (const r of J(f).rows || []) if (r.route && !routeBy.has(r.masterId)) routeBy.set(r.masterId, r.route); } catch { /* 없으면 skip */ }
    }

    const cls: Record<string, string[]> = { A: [], B: [], D: [], E: [], F: [] };
    const detail: any[] = [];
    for (const mid of koPop) {
      const ko = koBy.get(mid) as any;
      const ens = enBy.get(mid) || [];
      const canon = ens.filter((e) => e.status === 'canonical');
      const nr = ens.filter((e) => e.status === 'needs_review');
      const route = routeBy.get(mid) || 'unknown';
      let c: string, reason = '';
      if (canon.length === 0 && nr.length === 0) { c = 'F'; reason = 'EN STORE 행 없음(초안 자산 미스캔 — C 판정은 별도 패스 필요)'; }
      else if (canon.length === 0) { c = 'B'; reason = `needs_review ${nr.length}건, canonical 승격 전`; }
      else if (canon.length > 1) { c = 'E'; reason = `EN canonical 중복 ${canon.length}`; }
      else {
        const e = canon[0];
        const bad: string[] = [];
        if (!e.len || e.len < 200) bad.push('content 비었거나 과소');
        if (e.hangul) bad.push('한글 잔존');
        if (!e.sd) bad.push('sd-* 디자인 구조 없음');
        if (e.oralverb && route !== 'oral' && route !== 'unknown') bad.push(`비경구(${route})에 경구동사`);
        if (bad.length) { c = 'E'; reason = bad.join(' · '); }
        else if (e.ref !== ko.ref) { c = 'D'; reason = `sourceRef 불일치 KO=${ko.ref} EN=${e.ref}`; }
        else { c = 'A'; reason = ''; }
      }
      cls[c].push(mid);
      if (c !== 'A') detail.push({ masterId: mid, route, koSourceRef: ko.ref, enCount: ens.length, enStatus: ens.map((x) => x.status).join(','), enSourceRef: canon[0]?.ref ?? null, classification: c, reason });
    }

    // route별 집계
    const byRoute: Record<string, Record<string, number>> = {};
    for (const [k, arr] of Object.entries(cls)) for (const mid of arr) {
      const r = routeBy.get(mid) || 'unknown';
      (byRoute[r] ||= { A: 0, B: 0, D: 0, E: 0, F: 0 })[k]++;
    }

    const total = koPop.length;
    const sum = Object.values(cls).reduce((t, a) => t + a.length, 0);
    if (sum !== total) stop.push(`분류 합계 ${sum} != KO 모집단 ${total}`);

    const out = {
      wo: 'WO-O4O-DRUG-OTC-KO-GREEN-TO-EN-COVERAGE-AUDIT-V1', headAtStart: HEAD, liveDbWrite: 0,
      populationContract: 'V4 공식대상 − terminal/exclude → 영어 조건 없이 KO STORE canonical 보유 master 재구성',
      officialTargets: official.length, termExclude: termExcl.size, candidates: candidates.length,
      koPopulation: total, koCanonicalDuplicates: koDup.length,
      classification: { A_EN_CANONICAL_CURRENT: cls.A.length, B_EN_NEEDS_REVIEW: cls.B.length, D_EN_STALE: cls.D.length, E_EN_INCOMPLETE_OR_INVALID: cls.E.length, F_EN_MISSING: cls.F.length },
      note_C: 'C EN_DRAFT_ONLY 는 번역 JSON/draft 파일 자산 스캔이 필요해 본 패스에서 판정하지 않았다. 현재 F 에 포함돼 있으므로 F 는 상한값이다.',
      coverageRate: +(cls.A.length / total * 100).toFixed(2),
      byRoute, systemStop: stop,
    };
    fs.writeFileSync(P('otc-en-coverage-audit-summary.ga.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
    fs.writeFileSync(P('otc-en-coverage-incomplete-list.ga.json'), JSON.stringify({ wo: out.wo, total: detail.length, rows: detail }, null, 2) + '\n', 'utf8');
    fs.writeFileSync(P('otc-en-coverage-missing-F.ga.json'), JSON.stringify({ wo: out.wo, total: cls.F.length, masterIds: cls.F }, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify(out, null, 2));
    if (stop.length) { console.error('\n*** SYSTEM STOP ***'); process.exitCode = 2; }
  } finally { await db.destroy(); }
  void masterRefV4;
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
