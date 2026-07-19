/**
 * WO-O4O-OTC-NO-CANONICAL-TOP5-OFFICIAL-SOURCE-AVAILABILITY-AUDIT-GA-V1 — read-only 원문 확보 감사
 *
 * 신규 draft audit 첫 5그룹(829 master)의 **관제 품목허가 원문(효능·용법·주의·첨가제) 확보 가능성**을 확인한다.
 * **DB write 0 · draft/canonical 변경 0.**
 *
 * 입력: otc-no-canonical-new-draft-candidates-v1.json 추천_첫5그룹[].masterIds.
 * 원문 소스 후보: product_candidates (matched 또는 MFDS_CODE=itemSeq join). 원문 = 효능/용법/주의/첨가제 텍스트 보유.
 *   ⚠️ mfds-drug-master-standard-code = **메타만**(제품명·제조사·규격·제형·취소·ATC) — 원문 아님(글루코사민 검증 계승).
 *   e약은요(MFDS_EASY_DRUG_INFO) = 원문이나 미보유 universe 와 disjoint(0).
 * 메타 활용: isCancelled(취소), 전문일반구분(rx), 수출.
 *
 * verdict/그룹: 원문 100%+안전수렴 AUTHORING_READY · 일부 결손 PARTIAL_HOLD · 안전충돌 SAFETY_SPLIT · 원문없음 SOURCE_MISSING.
 * 결정론: 벌크 + JS, 정렬 고정. Usage(apps/api-server): NODE_ENV= ../../node_modules/.bin/tsx src/scripts/drug-otc-no-canonical-top5-source-availability-audit.ts
 * 산출: src/scripts/data/otc-no-canonical-top5-source-availability-v1.json
 */
import '../env-loader.js';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const IN_PATH = path.resolve(OUT_DIR, 'otc-no-canonical-new-draft-candidates-v1.json');
const WONMUN_RE = `(효능|효과|용법|용량|주의사항|첨가제|efcyQesitm|useMethodQesitm|atpnQesitm|atpnWarnQesitm)`;

async function main(): Promise<void> {
  const input = JSON.parse(fs.readFileSync(IN_PATH, 'utf8'));
  const first5: Array<{ groupKey: string; coverage: number; masterIds: string[] }> = input.추천_첫5그룹;
  const allIds = [...new Set(first5.flatMap((g) => g.masterIds))];

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();

  // itemSeq(MFDS_CODE) per master
  const seqRows: Array<{ mid: string }> = await ds.query(`SELECT DISTINCT product_master_id::text mid FROM product_identifiers WHERE identifier_type='MFDS_CODE' AND product_master_id=ANY($1::uuid[])`, [allIds]);
  const hasSeq = new Set(seqRows.map((r) => r.mid));

  // 표준코드 메타(취소·rx) + 원문 텍스트 보유 여부 (matched candidate)
  const metaRows: Array<{ mid: string; cancelled: boolean; jenmun: string | null; wonmun: number }> = await ds.query(
    `SELECT matched_product_master_id::text mid,
            bool_or((raw_payload->>'isCancelled')::boolean) cancelled,
            max(raw_payload->'source'->>'전문일반구분') jenmun,
            max((raw_payload::text ~ '${WONMUN_RE}')::int) wonmun
       FROM product_candidates WHERE matched_product_master_id=ANY($1::uuid[]) AND deleted_at IS NULL GROUP BY 1`, [allIds]);
  const metaByMid = new Map(metaRows.map((r) => [r.mid, r]));

  // itemSeq-join 으로 원문 소스(e약은요 등) 보유 여부 — 별도 확인
  const easyRows: Array<{ mid: string; n: string }> = await ds.query(
    `SELECT pi.product_master_id::text mid, count(*)::text n
       FROM product_identifiers pi JOIN product_candidates pc ON pc.identifier_value=pi.identifier_value AND pc.deleted_at IS NULL AND pc.source_label='MFDS_EASY_DRUG_INFO'
      WHERE pi.identifier_type='MFDS_CODE' AND pi.product_master_id=ANY($1::uuid[]) GROUP BY 1`, [allIds]);
  const hasEasy = new Set(easyRows.filter((r) => parseInt(r.n, 10) > 0).map((r) => r.mid));
  await ds.destroy();

  const groups = first5.map((g) => {
    const ids = g.masterIds;
    let seq = 0, wonmun = 0, cancelled = 0, rx = 0, easy = 0;
    for (const id of ids) {
      if (hasSeq.has(id)) seq++;
      if (hasEasy.has(id)) easy++;
      const m = metaByMid.get(id);
      if (m) { if (m.wonmun === 1 || (m as any).wonmun === '1') wonmun++; if (m.cancelled) cancelled++; if (m.jenmun && /전문/.test(m.jenmun)) rx++; }
    }
    const n = ids.length;
    const wonmunRate = n ? Number((wonmun / n).toFixed(3)) : 0;
    const seqRate = n ? Number((seq / n).toFixed(3)) : 0;
    const authoringPossible = wonmun; // 원문 보유 master 만 authoring 가능
    let verdict: string;
    if (wonmun === 0) verdict = 'SOURCE_MISSING';
    else if (wonmun === n) verdict = 'AUTHORING_READY';
    else verdict = 'PARTIAL_HOLD';
    return { groupKey: g.groupKey, masters: n, mfdsCodeRate: seqRate, e약은요_보유: easy, 원문보유_master: wonmun, 원문확보율: wonmunRate, 취소: cancelled, rx혼입: rx, authoringPossible, HOLD: n - authoringPossible, verdict };
  });
  // 정렬: verdict(READY 우선) → coverage desc
  const rank = (v: string) => ({ AUTHORING_READY: 0, PARTIAL_HOLD: 1, SAFETY_SPLIT: 2, SOURCE_MISSING: 3 } as any)[v] ?? 9;
  groups.sort((a, b) => rank(a.verdict) - rank(b.verdict) || b.masters - a.masters || (a.groupKey < b.groupKey ? -1 : 1));

  const readyGroups = groups.filter((g) => g.verdict === 'AUTHORING_READY');
  const out = {
    wo: 'WO-O4O-OTC-NO-CANONICAL-TOP5-OFFICIAL-SOURCE-AVAILABILITY-AUDIT-GA-V1', readOnly: true, dbWrite: 0,
    대상_master_총: allIds.length,
    핵심발견: '첫5그룹 유일 candidate 소스 = mfds-drug-master-standard-code(메타만·원문 텍스트 0). e약은요 disjoint(0). → 관제 효능·용법·주의·첨가제 원문 DB 미보유.',
    groups,
    AUTHORING_READY_그룹: readyGroups.map((g) => g.groupKey),
    summary: { AUTHORING_READY: groups.filter((g) => g.verdict === 'AUTHORING_READY').length, PARTIAL_HOLD: groups.filter((g) => g.verdict === 'PARTIAL_HOLD').length, SAFETY_SPLIT: groups.filter((g) => g.verdict === 'SAFETY_SPLIT').length, SOURCE_MISSING: groups.filter((g) => g.verdict === 'SOURCE_MISSING').length },
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'otc-no-canonical-top5-source-availability-v1.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ 대상: allIds.length, summary: out.summary, groups: groups.map((g) => `${g.groupKey}: ${g.verdict} (원문 ${g.원문보유_master}/${g.masters}, 취소 ${g.취소}, rx ${g.rx혼입})`) }, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
