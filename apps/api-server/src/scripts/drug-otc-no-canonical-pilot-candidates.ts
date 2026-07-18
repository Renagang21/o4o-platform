/**
 * apply 재정의 → e약은요-미보유(STORE canonical 無) OTC master 첫 파일럿 후보 집계 (read-only)
 *
 * 배경: grounded 무성분명은 이미 e약은요 STORE canonical 슬롯을 점유 → authored INSERT 불가(unique 제약).
 *   실질 authored apply 대상 = STORE canonical 이 아예 없는 OTC master. 각 curated draft 가 커버하는
 *   promotable 을 커버리지 순으로 집계해 알파칼시돌형 순수 INSERT 첫 파일럿 후보를 재선정한다.
 *
 * ⚠️ read-only · DB write 0.
 *
 * 성능/결정론: per-draft LIKE×95 쿼리 스톰(선행 wildcard=풀스캔, statement timeout 취약) 대신
 *   벌크 6쿼리로 마스터·canonical·rx 집합을 한 번에 로드하고 draft 매칭·집계는 JS 에서 수행.
 *   재실행 byte-identical(정렬 결정론).
 *
 * promotable(draft 당) = 그룹(name·spec 매칭, 알파칼시돌 grpBase 동일) 중 OTC · rx 아님 · STORE ko canonical(any source) 無.
 *
 * 산출: otc-no-canonical-pilot-candidates-v1.json
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const REQUIRED = ['efficacy', 'usage', 'caution', 'summaryTable'] as const;

function draftComplete(cj: any): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const f of REQUIRED) {
    const v = cj?.[f];
    if (f === 'summaryTable') { if (!v || typeof v !== 'object' || Object.keys(v).length === 0) missing.push(f); }
    else if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) missing.push(f);
  }
  return { complete: missing.length === 0, missing };
}
// 경구 여부(draft doseForm) — 경구·단일 파일럿 조건. 질정/좌제/점안 등 비경구 제외.
const isOral = (form?: string): boolean => !!form && !/질정|질좌|좌제|좌약|점안|점이|점비|질내|외용|크림|연고|패치|첩부/.test(form);

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();

  // === 벌크 로드(6 쿼리) ===
  const otc: Array<{ id: string; name: string; spec: string | null }> = await ds.query(
    `SELECT DISTINCT pm.id::text id, pm.name, pm.specification spec
     FROM product_masters pm JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
     WHERE pm.regulatory_type='DRUG'`);
  const loadSet = async (sql: string): Promise<Set<string>> => new Set((await ds.query(sql) as Array<{ id: string }>).map((r) => r.id));
  const koCanon = await loadSet(`SELECT DISTINCT s.master_id::text id FROM shared_product_descriptions s JOIN product_drug_extensions e ON e.product_master_id=s.master_id AND e.drug_category='otc' AND e.deleted_at IS NULL WHERE s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND COALESCE(s.language,'ko')='ko'`);
  const enCanon = await loadSet(`SELECT DISTINCT s.master_id::text id FROM shared_product_descriptions s JOIN product_drug_extensions e ON e.product_master_id=s.master_id AND e.drug_category='otc' AND e.deleted_at IS NULL WHERE s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='en'`);
  const koNeedsReview = await loadSet(`SELECT DISTINCT s.master_id::text id FROM shared_product_descriptions s JOIN product_drug_extensions e ON e.product_master_id=s.master_id AND e.drug_category='otc' AND e.deleted_at IS NULL WHERE s.status='needs_review' AND s.description_type='STORE' AND s.deleted_at IS NULL AND COALESCE(s.language,'ko')='ko'`);
  const rxSet = await loadSet(`SELECT DISTINCT e.product_master_id::text id FROM product_drug_extensions e WHERE e.drug_category='rx' AND e.deleted_at IS NULL`);
  const drafts: Array<{ candidate_id: string; title: string; seed_json: any; content_json: any }> = await ds.query(
    `SELECT candidate_id::text, title, seed_json, content_json FROM product_candidate_description_drafts WHERE deleted_at IS NULL ORDER BY candidate_id`);
  await ds.destroy();

  // universe = OTC 전체 - OTC 중 ko STORE canonical 보유
  const universe = otc.length - koCanon.size;

  // === draft 매칭·집계 (JS) — 알파칼시돌 grpBase 동일: name endsWith '(ingredient)', spec 1st token=dose, name includes form ===
  const specDose = (spec: string | null): string => (spec || '').split(' / ')[0].trim();
  const rows: any[] = [];
  for (const d of drafts) {
    const seed = d.seed_json || {};
    const ingredient = seed.ingredient as string | undefined;
    const dose = seed.strengthToken as string | undefined;
    const formKeyword = seed.doseForm as string | undefined;
    const comp = draftComplete(d.content_json);
    const contentPending = d.content_json?.contentPending === true;
    let groupTotal = 0, rx = 0, promotable = 0, koNR = 0, enC = 0, err: string | null = null;
    let promotableIds: string[] = [];
    if (ingredient && dose && formKeyword) {
      const suffix = `(${ingredient})`;
      const group = otc.filter((m) => m.name.endsWith(suffix) && specDose(m.spec) === dose && m.name.includes(formKeyword));
      groupTotal = group.length;
      rx = group.filter((m) => rxSet.has(m.id)).length;
      const prom = group.filter((m) => !rxSet.has(m.id) && !koCanon.has(m.id));
      promotable = prom.length; promotableIds = prom.map((m) => m.id).sort();
      koNR = prom.filter((m) => koNeedsReview.has(m.id)).length;
      enC = group.filter((m) => enCanon.has(m.id)).length;
    } else err = 'seed 그룹키 불완전';
    const alreadyPromoted = groupTotal - promotable - rx; // 그룹 중 이미 canonical 보유(참고)
    rows.push({
      candidate_id: d.candidate_id, title: d.title, groupKey: seed.groupKey,
      ingredient, dose, formKeyword, draftComplete: comp.complete, missing: comp.missing, contentPending,
      oral: isOral(formKeyword), groupTotal, rx, alreadyPromoted, promotable, koNeedsReview: koNR, enCanonical: enC, err,
      pharmHomogeneous: !!(ingredient && dose && formKeyword),
      예상: { ko_INSERT: promotable, en_INSERT_after_translation: promotable, ko_flip: promotable, en_flip: promotable },
      promotableIds,
    });
  }

  const usableAll = rows.filter((r) => r.draftComplete && !r.contentPending && !r.err && r.promotable > 0)
    .sort((a, b) => b.promotable - a.promotable || a.candidate_id.localeCompare(b.candidate_id));
  const usable = usableAll.filter((r) => r.oral);
  const usableNonOral = usableAll.filter((r) => !r.oral);

  const summary = {
    wo: 'apply 재정의 → e약은요-미보유(STORE canonical 無) 첫 파일럿 후보 집계', dbWrite: 0, readOnly: true,
    universe_OTC_STOREcanonical_無: universe, otc_total: otc.length,
    총_draft: rows.length,
    사용가능_draft_경구: usable.length, 사용가능_draft_비경구별도트랙: usableNonOral.length,
    추천_top3_경구: usable.slice(0, 3).map((r) => ({ candidate_id: r.candidate_id, title: r.title, groupKey: r.groupKey, promotable: r.promotable, groupTotal: r.groupTotal, rx: r.rx, koNeedsReview: r.koNeedsReview, enCanonical: r.enCanonical, pharmHomogeneous: r.pharmHomogeneous, 예상: r.예상, rollback_master_ids: r.promotableIds })),
    비경구별도트랙: usableNonOral.map((r) => ({ title: r.title, promotable: r.promotable, formKeyword: r.formKeyword })),
    사용가능_경구_전체: usable.map((r) => ({ title: r.title, promotable: r.promotable, groupTotal: r.groupTotal, rx: r.rx })),
    제외_draft: rows.filter((r) => !(r.draftComplete && !r.contentPending && !r.err && r.promotable > 0 && r.oral))
      .map((r) => ({ title: r.title, promotable: r.promotable, reason: r.err ? r.err : !r.oral && r.promotable > 0 ? '비경구(별도트랙)' : r.contentPending ? 'contentPending' : !r.draftComplete ? 'draft 미완성:' + r.missing.join(',') : 'promotable 0(그룹 이미 canonical 보유)' }))
      .sort((a, b) => b.promotable - a.promotable),
  };
  fs.writeFileSync(path.join(OUT_DIR, 'otc-no-canonical-pilot-candidates-v1.json'), JSON.stringify({ ...summary, allDrafts: rows.map((r) => ({ ...r, promotableIds: undefined })) }, null, 2), 'utf8');
  console.log(JSON.stringify({ ...summary, 제외_draft: undefined }, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? (e.message + '\n' + e.stack) : e); process.exit(1); });
