/**
 * READ-ONLY — Agent B 소유 복합형(combo) census. DB write 0.
 *   PROXY_PORT=5442 DBU=o4o_api DBP=... DBN=o4o_platform npx tsx src/scripts/hff-combo-b-census.ts --out <dir>
 *
 * WO-O4O-HFF-COMBO-COMPLETION-B-GUT-METABOLIC-V1 B-01/B-02.
 * MFDS HFF 후보 전량을 단일 스캔하며 BASE_STANDARD 를 parseSpecs 로 분해해
 *   (a) 완전 분류(unknown 0) 다원료 signature 별 count / promoted(=matched_master) 를 집계 → 생산가능 combo 풀
 *   (b) 미분류 라벨(unknownLabels) 빈도 집계 → B-03 미등록 원료 발굴 후보
 * env-loader 미import(로컬 표준 우회) — DBU/DBP/DBN 커스텀 env 직접 사용(공용 파이프 계약 무변경).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { parseSpecs } from './hff-source-parse.js';
import { NUTRIENT_META, FUNCTIONAL_META } from './hff-nutrient-registry.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out') || '.';
fs.mkdirSync(OUTDIR, { recursive: true });
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5442', 10);
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;
const metaOf = (k: string) => NUTRIENT_META[k] ?? FUNCTIONAL_META[k];
// B 도메인 functional 키(등록됨): 대사·혈당·체지방·콜레스테롤·면역·식이섬유.
const B_FUNC = new Set(['가르시니아', '녹차', '식이섬유', '감마리놀렌산', '프로폴리스', '옥타코사놀']);
// A/C 도메인 functional 키(등록됨): 눈·인지·혈행·관절·간·항산화.
const AC_FUNC = new Set(['루테인', '은행잎', '테아닌', '오메가3', '코엔자임Q10', 'MSM', '글루코사민', '밀크씨슬']);

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT,
    username: process.env.DBU, password: process.env.DBP, database: process.env.DBN ?? 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    // baseline
    const bl = await ds.query(
      `SELECT
        (SELECT count(*)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND source_type='o4o_hff_generated') storeHff,
        (SELECT count(*)::int FROM product_masters m WHERE m.status='ACTIVE' AND m.regulatory_type='건강기능식품' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(m.tags::jsonb) t WHERE t LIKE 'batch:combo-%')) comboAll,
        (SELECT count(*)::int FROM product_masters m WHERE m.status='ACTIVE' AND m.regulatory_type='건강기능식품' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(m.tags::jsonb) t WHERE t LIKE 'batch:combo-%-b%')) comboB`);
    // taken permits (canonical STORE 존재)
    const takenRows: Array<{ p: string }> = await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND m.mfds_permit_number IS NOT NULL`);
    const taken = new Set(takenRows.map((r) => r.p));

    type Sig = { total: number; promoted: number; takenCanon: number; liquid: number; untaken: number; sample: string[]; untakenStmts: string[] };
    const sigs: Record<string, Sig> = {};
    const unknownFreq: Record<string, number> = {};
    let after = '00000000-0000-0000-0000-000000000000';
    let scanned = 0;
    for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; sungsang: string; srv: string; base: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
           coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang,
           coalesce(raw_payload->'source'->>'SRV_USE','') srv, coalesce(raw_payload->'source'->>'BASE_STANDARD','') base
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 3000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) {
        scanned++;
        const sp = parseSpecs(r.base);
        const keys = [...sp.byKey.keys()];
        // 미분류 라벨 빈도(B-03 발굴): 다원료 맥락에서만(라벨 2+ 또는 분류 1+미분류 1+)
        if (sp.unknownLabels.length && (keys.length + sp.unknownLabels.length) >= 2) {
          for (const u of sp.unknownLabels) unknownFreq[u] = (unknownFreq[u] ?? 0) + 1;
        }
        if (keys.length < 2 || sp.unknownLabels.length > 0) continue; // 완전분류 다원료만 signature 집계
        const sig = keys.slice().sort().join('+');
        const S = (sigs[sig] ??= { total: 0, promoted: 0, takenCanon: 0, liquid: 0, untaken: 0, sample: [], untakenStmts: [] });
        S.total++;
        if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`)) { S.liquid++; continue; }
        if (r.mid != null) { S.promoted++; continue; }
        if (r.stmt && taken.has(r.stmt)) { S.takenCanon++; continue; }
        S.untaken++;
        if (r.stmt) S.untakenStmts.push(r.stmt);
        if (S.sample.length < 3) S.sample.push(r.stmt);
      }
      after = rows[rows.length - 1].id;
    }

    // signature 도메인 분류
    const classify = (sig: string): string => {
      const ks = sig.split('+');
      const hasB = ks.some((k) => B_FUNC.has(k));
      const hasAC = ks.some((k) => AC_FUNC.has(k));
      const allNutrient = ks.every((k) => metaOf(k) && metaOf(k)!.kind !== 'functional');
      if (hasB && !hasAC) return 'B';
      if (hasAC && !hasB) return 'AC';
      if (hasB && hasAC) return 'MIXED';
      if (allNutrient) return 'NUTRIENT';
      return 'OTHER';
    };
    const rowsOut = Object.entries(sigs).map(([sig, s]) => ({ sig, n: s.total, promoted: s.promoted, takenCanon: s.takenCanon, liquid: s.liquid, untaken: s.untaken, dom: classify(sig), size: sig.split('+').length, sample: s.sample, untakenStmts: s.untakenStmts }))
      .sort((a, b) => b.untaken - a.untaken);
    fs.writeFileSync(path.join(OUTDIR, 'combo-b-census.json'), JSON.stringify({ baseline: bl[0], scanned, sigs: rowsOut, unknownFreq }, null, 1));
    // B/MIXED 생산 대상 sig→untaken stmt 목록(select --statement-nos-file 용, 전수 스캔 회피)
    const bStmtMap = rowsOut.filter((r) => (r.dom === 'B' || r.dom === 'MIXED') && r.untaken > 0)
      .map((r) => ({ sig: r.sig, dom: r.dom, size: r.size, untaken: r.untaken, stmts: r.untakenStmts }));
    fs.writeFileSync(path.join(OUTDIR, 'combo-b-untaken.json'), JSON.stringify(bStmtMap, null, 1));

    const byDom: Record<string, { sigCount: number; untaken: number }> = {};
    for (const r of rowsOut) { const d = (byDom[r.dom] ??= { sigCount: 0, untaken: 0 }); d.sigCount++; d.untaken += r.untaken; }
    const bUntaken = rowsOut.filter((r) => (r.dom === 'B' || r.dom === 'MIXED') && r.untaken > 0);
    const topUnknown = Object.entries(unknownFreq).sort((a, b) => b[1] - a[1]).slice(0, 40);
    console.log('JSON_COMBO_CENSUS_BEGIN');
    console.log(JSON.stringify({ baseline: bl[0], scanned, byDom,
      bProducible: bUntaken.map((r) => ({ sig: r.sig, untaken: r.untaken, size: r.size, dom: r.dom, sample: r.sample })),
      topUnknownLabels: topUnknown }, null, 1));
    console.log('JSON_COMBO_CENSUS_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
