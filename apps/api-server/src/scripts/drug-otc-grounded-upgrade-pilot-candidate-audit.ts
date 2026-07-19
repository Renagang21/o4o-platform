/**
 * WO-O4O-OTC-GROUNDED-UPGRADE-PILOT-CANDIDATE-AUDIT-GA-V1 — e약은요→authored canonical 승격 파일럿 후보 (read-only)
 *
 * bridge 통합 `authored 그대로확장`(158그룹/1,201제품) 중 첫 승격 파일럿 후보를 선정한다. **DB write 0.**
 * 입력: otc-full-corpus-authored-bridge-groups-v1.json (bucket=authored그대로확장).
 * 성능: 벌크 로드(6쿼리) + JS 집계 — 선행 wildcard 그룹쿼리 풀스캔 회피(pilot 계약 계승). 결정론(정렬 고정).
 * 재검증: 그룹 master(OTC·e약은요 STORE ko canonical) · authored draft(source_ref) · authored 충돌 · **안전지문 동질 subset**.
 * 제외: 민감 약효군 · 검토후확장/안전불일치/비경구 · 기존 authored canonical · 원문/안전지문 불일치 · Track B.
 * Usage(apps/api-server): NODE_ENV= ../../node_modules/.bin/tsx src/scripts/drug-otc-grounded-upgrade-pilot-candidate-audit.ts
 * 산출: src/scripts/data/otc-grounded-upgrade-pilot-candidates-v1.json
 */
import '../env-loader.js';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const BRIDGE = path.resolve(OUT_DIR, 'otc-full-corpus-authored-bridge-groups-v1.json');
const BUCKET = 'authored그대로확장';
const SENSITIVE_RE = /아스피린|아세틸살리실산|와파린|클로피도그렐|헤파린|덱사메타손|프레드니솔론|하이드로코르티손|모르핀|코데인|메칠페니데이트|인슐린|레보티록신/;
const shaS = (s: string) => createHash('md5').update(s).digest('hex').slice(0, 12);
function normSafety(atpn: string, usem: string): string {
  const t = `${atpn || ''} ${usem || ''}`.normalize('NFKC').replace(/<[^>]+>/g, ' ');
  const dosage = [...new Set((usem.normalize('NFKC').match(/\d[\d.,]*\s?(정|캡슐|포|mg|밀리그램|㎎|g|㎍|mL|㎖|방울|회|일|시간)/gi) || []).map((x) => x.replace(/\s/g, '')))].sort().join('|');
  const age = [...new Set((t.match(/만?\s?\d+\s?(세|개월)\s?(이상|미만|이하)?/g) || []).map((x) => x.replace(/\s/g, '')))].sort().join('|');
  const contra = ['과민', '임부', '임신', '수유', '어린이|소아', '고령', '간장애|간질환', '신장애|신질환', '녹내장', '전립선', '심장|심혈관', '고혈압', '당뇨', '갑상선']
    .filter((k) => new RegExp(k).test(atpn)).map((k) => k.split('|')[0]).sort().join('|');
  return shaS(`${dosage}#${age}#${contra}`);
}

async function main(): Promise<void> {
  const bridge = JSON.parse(fs.readFileSync(BRIDGE, 'utf8'));
  const arr: any[] = bridge.groups || bridge;
  const expand = arr.filter((x) => (x.counts || {})[BUCKET] > 0)
    .map((x) => ({ pharmKey: x.pharmKey, keyType: x.keyType, ingredient: x.ingredient, strength: x.strength, form: x.form, route: x.route, atc: x.atc_code, expand: x.counts[BUCKET], size: x.size, sample: x.sampleName }))
    .sort((a, b) => b.expand - a.expand || (a.pharmKey < b.pharmKey ? -1 : a.pharmKey > b.pharmKey ? 1 : 0));
  const top10 = expand.slice(0, 10);
  const ings = [...new Set(top10.map((g) => g.ingredient))];

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();

  // === 벌크 로드 (Top10 성분으로 좁힘) ===
  // 후보 성분 이름을 가진 OTC master (선행 wildcard 대신 성분 suffix 정확매칭은 JS 에서)
  const like = ings.map((_, i) => `pm.name LIKE '%('||$${i + 1}||')'`).join(' OR ');
  const otc: Array<{ id: string; name: string; spec: string }> = await ds.query(
    `SELECT DISTINCT pm.id::text id, pm.name, coalesce(pm.specification,'') spec
       FROM product_masters pm JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
      WHERE ${like}`, ings);
  const otcIds = otc.map((m) => m.id);
  const easyCanonRows: Array<{ id: string }> = await ds.query(
    `SELECT DISTINCT master_id::text id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`, [otcIds]);
  const easyCanon = new Set(easyCanonRows.map((r) => r.id));
  const easyDupRows: Array<{ id: string }> = await ds.query(
    `SELECT master_id::text id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL GROUP BY master_id HAVING count(*)>1`, [otcIds]);
  const easyDup = new Set(easyDupRows.map((r) => r.id));
  const authConfRows: Array<{ id: string }> = await ds.query(
    `SELECT DISTINCT master_id::text id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_type='mfds_drug_otc' AND description_type='STORE' AND status IN ('needs_review','canonical') AND deleted_at IS NULL`, [otcIds]);
  const authConf = new Set(authConfRows.map((r) => r.id));
  const seqRows: Array<{ mid: string; seq: string }> = await ds.query(
    `SELECT product_master_id::text mid, identifier_value seq FROM product_identifiers WHERE identifier_type='MFDS_CODE' AND product_master_id=ANY($1::uuid[])`, [otcIds]);
  const seqByMid = new Map<string, string>(); for (const r of seqRows) if (!seqByMid.has(r.mid)) seqByMid.set(r.mid, r.seq);
  const seqs = [...new Set([...seqByMid.values()])];
  const easyRows: Array<{ seq: string; atpn: string; usem: string }> = seqs.length ? await ds.query(
    `SELECT identifier_value seq, coalesce(raw_payload->'source'->>'atpnQesitm','') atpn, coalesce(raw_payload->'source'->>'useMethodQesitm','') usem
       FROM product_candidates WHERE source_label='MFDS_EASY_DRUG_INFO' AND deleted_at IS NULL AND identifier_value=ANY($1::text[])`, [seqs]) : [];
  const easyBySeq = new Map<string, { atpn: string; usem: string }>(); for (const r of easyRows) if (!easyBySeq.has(r.seq)) easyBySeq.set(r.seq, { atpn: r.atpn, usem: r.usem });
  const draftRows: Array<{ gk: string; cid: string }> = await ds.query(
    `SELECT seed_json->>'groupKey' gk, candidate_id::text cid FROM product_candidate_description_drafts WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL AND seed_json->>'groupKey'=ANY($1::text[])`, [top10.map((g) => `${g.ingredient}|${g.strength}|${g.form}`)]);
  const draftRef = new Map<string, string>(); for (const r of draftRows) if (!draftRef.has(r.gk)) draftRef.set(r.gk, r.cid);
  await ds.destroy();

  const specDose = (spec: string) => spec.split(' / ')[0].trim();
  const results = top10.map((g) => {
    const suffix = `(${g.ingredient})`;
    const masterIds = otc.filter((m) => m.name.endsWith(suffix) && specDose(m.spec) === g.strength && m.name.includes(g.form) && easyCanon.has(m.id)).map((m) => m.id).sort();
    const easyDupN = masterIds.filter((id) => easyDup.has(id)).length;
    const authoredConflict = masterIds.filter((id) => authConf.has(id)).length;
    const groupKey = `${g.ingredient}|${g.strength}|${g.form}`;
    const authoredSourceRef = draftRef.get(groupKey) ?? null;
    // 안전지문 동질 subset
    const fpByMid = new Map<string, string>();
    for (const id of masterIds) { const seq = seqByMid.get(id); const e = seq ? easyBySeq.get(seq) : null; if (e) fpByMid.set(id, normSafety(e.atpn, e.usem)); }
    const fpCount = new Map<string, number>(); for (const fp of fpByMid.values()) fpCount.set(fp, (fpCount.get(fp) ?? 0) + 1);
    const safetyDistinct = fpCount.size;
    const domFp = [...fpCount.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? null;
    const homogeneousIds = masterIds.filter((id) => fpByMid.get(id) === domFp).sort();
    const wonmunRate = masterIds.length ? Number((fpByMid.size / masterIds.length).toFixed(3)) : 0;

    const sensitive = SENSITIVE_RE.test(g.ingredient);
    const reasons: string[] = [];
    if (sensitive) reasons.push('민감 약효군');
    if (g.route !== 'oral') reasons.push('비경구');
    if (!authoredSourceRef) reasons.push('authored draft 없음');
    if (authoredConflict > 0) reasons.push(`authored 충돌 ${authoredConflict}`);
    if (easyDupN > 0) reasons.push(`e약은요 canonical 중복 ${easyDupN}`);
    if (masterIds.length === 0) reasons.push('e약은요 canonical master 0');
    if (safetyDistinct !== 1) reasons.push(`안전지문 분리 필요(distinct ${safetyDistinct})`);
    if (wonmunRate < 1) reasons.push(`원문 결손(확보율 ${wonmunRate})`);
    const verdict = reasons.length ? 'EXCLUDED' : 'READY';

    return {
      pharmKey: g.pharmKey, groupKey, sample: g.sample, keyType: g.keyType, route: g.route, atc: g.atc,
      bridge_확장: g.expand, e약은요_canonical_master: masterIds.length, e약은요_canonical_중복: easyDupN,
      안전지문_distinct: safetyDistinct, 안전동질_master: homogeneousIds.length, 원문확보율: wonmunRate,
      authored_source_ref_id: authoredSourceRef, authored_충돌: authoredConflict, 민감약효군: sensitive,
      verdict, excludeReasons: reasons,
      예상write: { SPD_upgrade: homogeneousIds.length, audit_log: homogeneousIds.length },
      rollback_master_ids: homogeneousIds,
    };
  });

  const ready = results.filter((r) => r.verdict === 'READY');
  const recommended = ready[0] ?? null;
  const out = {
    wo: 'WO-O4O-OTC-GROUNDED-UPGRADE-PILOT-CANDIDATE-AUDIT-GA-V1', readOnly: true, dbWrite: 0,
    track: 'A (grounded upgrade: e약은요 canonical → authored canonical 교체)',
    authored그대로확장_그룹수: expand.length, authored그대로확장_master합: expand.reduce((s, x) => s + x.expand, 0),
    top10: results.map((r) => ({ ...r, rollback_master_ids: undefined })),
    추천_첫파일럿: recommended ? { groupKey: recommended.groupKey, sample: recommended.sample, 승격대상_master: recommended.안전동질_master, e약은요_canonical_master: recommended.e약은요_canonical_master, authored_source_ref_id: recommended.authored_source_ref_id, 예상write: recommended.예상write, rollback_master_ids: recommended.rollback_master_ids } : null,
    summary: { READY: ready.length, EXCLUDED: results.filter((r) => r.verdict === 'EXCLUDED').length },
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'otc-grounded-upgrade-pilot-candidates-v1.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ authored그대로확장_그룹수: expand.length, summary: out.summary, 추천: recommended ? `${recommended.groupKey} (동질 master ${recommended.안전동질_master}, ref ${recommended.authored_source_ref_id?.slice(0, 8)})` : null,
    top10: results.map((r) => `${r.groupKey}: ${r.verdict}${r.excludeReasons.length ? '(' + r.excludeReasons.join(',') + ')' : ''} — e약은요 ${r.e약은요_canonical_master}/동질 ${r.안전동질_master}(distinct ${r.안전지문_distinct}), 충돌 ${r.authored_충돌}`) }, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
