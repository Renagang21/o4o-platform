/**
 * WO-O4O-OTC-NO-CANONICAL-NEW-DRAFT-CANDIDATE-AUDIT-GA-V1 — 신규 draft authoring 후보 audit (read-only)
 *
 * STORE ko canonical 미보유 OTC 중 **draft 자체가 없는** 경구 단일제 그룹을 성분·함량·제형으로 묶어
 * 커버리지·원문 grounding율·안전지문 단일성으로 신규 authoring 후보를 선정한다. **DB write 0.**
 *
 * 그룹화: ingredient = name 끝 `(성분)` · dose = specification 1st token(' / ' split) · form = spec/name 제형.
 * 제외: rx · 비경구(NON_ORAL_RE) · 복합제(성분 suffix 에 `/`·`+`·`,`) · 기존 draft groupKey(성분|함량|제형) 보유
 *       · STORE ko canonical 보유(universe 정의상 이미 제외) · 글루코사민(첨가제 HOLD) · 클로트리마졸(질정).
 * grounding = e약은요(MFDS_EASY_DRUG_INFO) 원문 보유(MFDS_CODE=itemSeq 조인). 안전지문 = norm(atpn+usem) distinct.
 *
 * 성능/결정론: 벌크 로드 + JS 집계. 정렬 = coverage desc, tie groupKey asc → byte-identical.
 * 접속: Cloud SQL Auth Proxy(:5442). Usage(apps/api-server): NODE_ENV= ../../node_modules/.bin/tsx src/scripts/drug-otc-no-canonical-new-draft-candidate-audit.ts
 * 산출: src/scripts/data/otc-no-canonical-new-draft-candidates-v1.json
 */
import '../env-loader.js';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const sha = (s: string) => createHash('md5').update(s).digest('hex').slice(0, 12);
const NON_ORAL_RE = /질정|질용|질좌|질내|좌제|좌약|점안|안연고|점이|점비|비강|외용|크림|연고|로션|겔|젤|패치|첩부|카타플|파스|스프레이|에어로솔|가글|함수|트로키|질캡슐|vaginal/i;
const COMBO_RE = /[/+]|,|·(?=.*[가-힣])/; // 성분 suffix 복합 신호(보수적: / + ,)

const ingredientOf = (name: string): string | null => { const m = name.match(/\(([^)]+)\)\s*$/); return m ? m[1].trim() : null; };
const doseOf = (spec: string | null): string => (spec || '').split(' / ')[0].trim();
function formOf(spec: string | null, name: string): string {
  const t = `${spec || ''} ${name}`.normalize('NFKC');
  const table: [RegExp, string][] = [[/질정/, '질정'], [/좌제/, '좌제'], [/점안/, '점안액'], [/점이/, '점이액'], [/시럽|현탁/, '시럽'], [/연질캡슐|연질캅셀/, '연질캡슐'], [/캡슐|캅셀/, '캡슐'], [/과립/, '과립'], [/산제|가루/, '산제'], [/정/, '정'], [/액/, '액제']];
  for (const [re, f] of table) if (re.test(t)) return f;
  return '기타';
}
// 안전지문 = **coarse** 축(용법 수치 + 연령대 + 핵심 금기 토큰)만. 제품별 문구 변이에 둔감.
function normSafety(atpn: string, usem: string): string {
  const t = `${atpn || ''} ${usem || ''}`.normalize('NFKC').replace(/<[^>]+>/g, ' ');
  const dosage = [...new Set((usem.normalize('NFKC').match(/\d[\d.,]*\s?(정|캡슐|포|mg|밀리그램|㎎|g|㎍|mL|㎖|방울|회|일|시간)/gi) || []).map((x) => x.replace(/\s/g, '')))].sort().join('|');
  const age = [...new Set((t.match(/만?\s?\d+\s?(세|개월)\s?(이상|미만|이하)?/g) || []).map((x) => x.replace(/\s/g, '')))].sort().join('|');
  const contra = ['과민', '임부', '임신', '수유', '어린이|소아', '고령', '간장애|간질환', '신장애|신질환', '녹내장', '전립선', '심장|심혈관', '고혈압', '당뇨', '갑상선']
    .filter((k) => new RegExp(k).test(atpn)).map((k) => k.split('|')[0]).sort().join('|');
  return sha(`${dosage}#${age}#${contra}`);
}

async function loadSet(ds: any, q: string): Promise<Set<string>> { const r: Array<{ id: string }> = await ds.query(q); return new Set(r.map((x) => x.id)); }

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();

  // === 벌크 로드 ===
  const otc: Array<{ id: string; name: string; spec: string | null }> = await ds.query(
    `SELECT DISTINCT pm.id::text id, pm.name, pm.specification spec
       FROM product_masters pm JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL`);
  const koCanon = await loadSet(ds, `SELECT DISTINCT s.master_id::text id FROM shared_product_descriptions s JOIN product_drug_extensions e ON e.product_master_id=s.master_id AND e.drug_category='otc' AND e.deleted_at IS NULL WHERE s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND COALESCE(s.language,'ko')='ko'`);
  const rxSet = await loadSet(ds, `SELECT DISTINCT e.product_master_id::text id FROM product_drug_extensions e WHERE e.drug_category='rx' AND e.deleted_at IS NULL`);
  // 기존 draft groupKey 집합(성분|함량|제형)
  const draftRows: Array<{ gk: string }> = await ds.query(`SELECT DISTINCT seed_json->>'groupKey' gk FROM product_candidate_description_drafts WHERE deleted_at IS NULL AND seed_json->>'groupKey' IS NOT NULL`);
  const draftGK = new Set(draftRows.map((r) => r.gk));
  // itemSeq(MFDS_CODE) per master
  const idRows: Array<{ mid: string; seq: string }> = await ds.query(`SELECT product_master_id::text mid, identifier_value seq FROM product_identifiers WHERE identifier_type='MFDS_CODE'`);
  const seqByMid = new Map<string, string>(); for (const r of idRows) if (!seqByMid.has(r.mid)) seqByMid.set(r.mid, r.seq);
  // e약은요 원문 per itemSeq (grounding + safety)
  const easyRows: Array<{ seq: string; atpn: string; usem: string }> = await ds.query(
    `SELECT identifier_value seq, coalesce(raw_payload->'source'->>'atpnQesitm','') atpn, coalesce(raw_payload->'source'->>'useMethodQesitm','') usem
       FROM product_candidates WHERE source_label='MFDS_EASY_DRUG_INFO' AND deleted_at IS NULL`);
  const easyBySeq = new Map<string, { atpn: string; usem: string }>(); for (const r of easyRows) if (!easyBySeq.has(r.seq)) easyBySeq.set(r.seq, { atpn: r.atpn, usem: r.usem });
  await ds.destroy();

  const universe = otc.length - koCanon.size;

  // === 그룹화(JS) ===
  interface G { groupKey: string; ingredient: string; dose: string; form: string; masters: string[]; grounded: number; safeSet: Set<string> }
  const groups = new Map<string, G>();
  let skipRx = 0, skipNonOral = 0, skipCombo = 0, skipHasDraft = 0, skipGluco = 0, skipClot = 0, skipNoKey = 0, skipHasCanon = 0, skipManual = 0, skipExport = 0;
  for (const m of otc) {
    if (koCanon.has(m.id)) { skipHasCanon++; continue; }        // universe: no ko canonical
    if (rxSet.has(m.id)) { skipRx++; continue; }
    const ing = ingredientOf(m.name);
    const dose = doseOf(m.spec);
    if (!ing || !dose) { skipNoKey++; continue; }
    if (/수출용|수출전용|for\s*export/i.test(ing) || /전량\s*수출|수출\s*전용/.test(m.name)) { skipExport++; continue; } // 수출전용(소비자 대상 아님)
    if (COMBO_RE.test(ing) || /혼합|복합/.test(ing)) { skipCombo++; continue; }  // 복합제(기호·혼합·복합)
    if (/결정글루코사민/.test(ing)) { skipGluco++; continue; }    // 첨가제 HOLD
    const form = formOf(m.spec, m.name);
    if (NON_ORAL_RE.test(`${form} ${m.name} ${m.spec || ''}`)) { skipNonOral++; continue; } // 비경구
    if (/클로트리마졸/.test(ing) && /질/.test(`${m.name} ${m.spec || ''}`)) { skipClot++; continue; }
    if (dose === '없음' || form === '기타') { skipManual++; continue; }  // 수동 추정 필요(함량·제형 미상)
    const gk = `${ing}|${dose}|${form}`;
    if (draftGK.has(gk)) { skipHasDraft++; continue; }           // 기존 draft 보유
    let g = groups.get(gk);
    if (!g) { g = { groupKey: gk, ingredient: ing, dose, form, masters: [], grounded: 0, safeSet: new Set() }; groups.set(gk, g); }
    g.masters.push(m.id);
    const seq = seqByMid.get(m.id); const e = seq ? easyBySeq.get(seq) : null;
    if (e) { g.grounded++; g.safeSet.add(normSafety(e.atpn, e.usem)); }
  }

  // === 후보 산출 ===
  const all = [...groups.values()].map((g) => ({
    groupKey: g.groupKey, ingredient: g.ingredient, dose: g.dose, form: g.form,
    coverage: g.masters.length, grounded: g.grounded,
    groundingRate: g.masters.length ? Number((g.grounded / g.masters.length).toFixed(3)) : 0,
    safetyDistinct: g.safeSet.size,
    safetyHomogeneous: g.grounded > 0 && g.safeSet.size === 1,
    masterIds: [...g.masters].sort(),
  }));
  // 결정론 정렬: coverage desc, tie groupKey asc
  const sortFn = (a: any, b: any) => (b.coverage - a.coverage) || (a.groupKey < b.groupKey ? -1 : a.groupKey > b.groupKey ? 1 : 0);
  all.sort(sortFn);

  // 진단: e약은요 grounding 분포 (구조적으로 0 — e약은요 보유 master 는 전부 이미 canonical, disjoint)
  const groundedGroups = all.filter((g) => g.grounded > 0);
  const groundedGroupCoverage = groundedGroups.reduce((s, g) => s + g.coverage, 0);
  const groundedTotalMasters = all.reduce((s, g) => s + g.grounded, 0);
  // e약은요 grounding 이 균일 0 이면 이를 필터로 쓰지 않고 커버리지 랭킹(Model B 신규 authoring 대상).
  //   grounded 그룹이 존재하면 그 그룹을 우선(e약은요 재사용 가능). 아니면 전 그룹 커버리지 랭킹.
  const eligible = groundedGroups.length > 0 ? groundedGroups.filter((g) => g.safetyHomogeneous) : all;
  const eligibleMode = groundedGroups.length > 0 ? 'e약은요_grounded_안전단일' : 'e약은요_grounding_0_커버리지랭킹(Model_B)';
  const top20 = eligible.slice(0, 20).map((g) => ({ ...g, masterIds: undefined, expected: { ko_INSERT: g.coverage, en_INSERT: g.coverage } }));
  const first5 = eligible.slice(0, 5).map((g) => ({ groupKey: g.groupKey, coverage: g.coverage, grounded: g.grounded, groundingRate: g.groundingRate, safetyDistinct: g.safetyDistinct, expected_ko_en: `${g.coverage}/${g.coverage}`, masterIds: g.masterIds }));
  const eligibleCoverage = eligible.reduce((s, g) => s + g.coverage, 0);

  const out = {
    wo: 'WO-O4O-OTC-NO-CANONICAL-NEW-DRAFT-CANDIDATE-AUDIT-GA-V1', readOnly: true, dbWrite: 0,
    universe_OTC_STOREcanonical_無: universe, otc_total: otc.length,
    exclusions: { rx: skipRx, nonOral: skipNonOral, combo: skipCombo, hasDraft: skipHasDraft, gluco: skipGluco, clotrimazole: skipClot, manualEstimate: skipManual, export: skipExport, noKey: skipNoKey, hasCanonical: skipHasCanon },
    draft없는_경구단일제_그룹수: all.length,
    grounding진단: { e약은요_grounded_그룹수: groundedGroups.length, e약은요_grounded_그룹_커버리지: groundedGroupCoverage, e약은요_grounded_master수: groundedTotalMasters,
      note: 'e약은요 원문 보유 OTC master 는 전부 이미 STORE canonical(mfds_easy_drug) → 미보유 universe 와 disjoint. e약은요 재사용 authoring 은 0. 아래 후보는 Model B(관제 원문 신규 authoring) 대상이며 grounding·안전지문은 authoring 시점 확보.' },
    eligibleMode,
    authoring후보_그룹수: eligible.length,
    authoring후보_총커버리지: eligibleCoverage,
    top20,
    추천_첫5그룹: first5,
    allEligibleGroupKeys: eligible.map((g) => g.groupKey),
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'otc-no-canonical-new-draft-candidates-v1.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ universe, otc_total: otc.length, exclusions: out.exclusions, 그룹수: all.length, grounding진단: out.grounding진단, 적격: eligible.length, 적격커버리지: eligibleCoverage, top5: first5.map((g) => `${g.groupKey}(cov ${g.coverage}, gr ${g.grounded})`) }, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
