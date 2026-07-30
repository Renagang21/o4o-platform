/**
 * WO-O4O-OTC-EASY-DRUG-V4-ROUTE-RECOVERABLE-535-FINAL-PRODUCTION-V1
 *   — 인체 미적용 기구 멸균제 3건 회수 (에이전트 가)
 *
 * 배경: 독립검증 IV-16 이 잡아낸 3 master 는 산화에틸렌 가스 멸균기용 카트리지로,
 *       인체에 적용하는 제품이 아니다. 상속 route 는 topical 이지만 사용법 전체가
 *       "멸균기에 장착" 이며 매장 소비자 설명서 대상 적격성 자체가 없다
 *       (선정 단계 PROFESSIONAL_USE 필터의 빈틈).
 *
 * 처리: route 재판정이 아니라 **대상 적격성 회수**. 본 배치가 쓴 authored 행만 되돌린다.
 *   KO/EN authored canonical → deprecated (본 배치 source_ref_id 인 행만)
 *   easy KO deprecated → canonical 복원 (본 배치가 강등한 행만)
 *   회수 audit INSERT
 *
 * 실행:
 *   dry-run : tsx src/scripts/otc-v4-route535-withdraw-nonhuman.ga.ts --port 5495
 *   apply   : OTC_V4_WITHDRAW_ROUTE535=CONFIRM tsx ... --apply --confirm --port 5495
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { DATA_DIR } from './otc-v4-master-leaflet-contract.ga.js';
import { WO_500, BATCH_ID_500 } from './otc-v4-route535-contract.ga.js';

const OUT = path.join(DATA_DIR, 'otc-v4-route535-withdraw-nonhuman.ga.json');
const CONFIRM_ENV = 'OTC_V4_WITHDRAW_ROUTE535';
const AUTHORED = ['mfds_drug_otc'];

/** 회수 대상 — 독립검증 IV-16 이 지목한 EO 가스 멸균 카트리지. */
const TARGETS = [
  '06712efc-26fd-43fa-b97e-3e5a3eafaaa1',
  '171812b7-cef2-489b-a6f8-74000c5ca0e3',
  '8fb8e44a-6ea2-4935-9ddc-d3e7e13df2e7',
];
const REASON = 'NON_HUMAN_DEVICE_STERILANT';

const has = (n: string): boolean => process.argv.includes(n);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => parseInt(arg('--port') || process.env.PROXY_PORT || '5502', 10);
const refV4 = (mid: string): string => {
  const h = crypto.createHash('md5').update(`otc-v4-master-leaflet:${mid}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

async function main(): Promise<void> {
  const APPLY = has('--apply') && has('--confirm') && process.env[CONFIRM_ENV] === 'CONFIRM';
  const pool = new Pool({ host: '127.0.0.1', port: port(), user: 'o4o_api', database: 'o4o_platform', password: process.env.PGPASSWORD || undefined, max: 2 });
  const rows: any[] = [];
  for (const mid of TARGETS) {
    const c = await pool.connect();
    const rep: any = { masterId: mid, reason: REASON, demoted: 0, restored: 0, audit: 0, committed: false };
    try {
      await c.query('BEGIN');
      const dem = await c.query(
        `UPDATE shared_product_descriptions SET status='deprecated', updated_at=now()
          WHERE master_id=$1::uuid AND description_type='STORE' AND source_type = ANY($2)
            AND source_ref_id=$3::uuid AND status='canonical' AND deleted_at IS NULL RETURNING id, COALESCE(language,'ko') lang`,
        [mid, AUTHORED, refV4(mid)]);
      rep.demoted = dem.rowCount ?? 0;
      rep.demotedLangs = dem.rows.map((r) => r.lang);
      const res = await c.query(
        `UPDATE shared_product_descriptions SET status='canonical', updated_at=now()
          WHERE master_id=$1::uuid AND description_type='STORE' AND source_type='mfds_easy_drug'
            AND COALESCE(language,'ko')='ko' AND status='deprecated' AND deleted_at IS NULL RETURNING id`, [mid]);
      rep.restored = res.rowCount ?? 0;
      const au = await c.query(
        `INSERT INTO shared_product_description_audit_logs (event_type, description_type, master_id, language, previous_status, new_status, metadata, performed_at)
         VALUES ('withdrawn','STORE',$1::uuid,'ko','canonical','deprecated',$2::jsonb, now()) RETURNING id`,
        [mid, JSON.stringify({ batchId: BATCH_ID_500, wo: WO_500, withdrawReason: REASON, source_ref_id: refV4(mid) })]);
      rep.audit = au.rowCount ?? 0;
      // 회수 후 정합: authored canonical 0 · easy ko canonical 정확히 1
      const chk = (await c.query(
        `SELECT
           (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND s.status='canonical' AND s.source_type = ANY($2) AND s.deleted_at IS NULL) authoredcanon,
           (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) easykocanon`,
        [mid, AUTHORED])).rows[0];
      rep.check = chk;
      const ok = chk.authoredcanon === 0 && chk.easykocanon === 1 && rep.demoted === 2 && rep.restored === 1;
      rep.pass = ok;
      if (APPLY && ok) { await c.query('COMMIT'); rep.committed = true; }
      else { await c.query('ROLLBACK'); }
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      rep.error = (e as Error).message;
      rep.pass = false;
    } finally { c.release(); }
    rows.push(rep);
  }
  await pool.end();
  const out = { wo: WO_500, kind: 'withdraw-non-human-device-sterilant', mode: APPLY ? 'APPLY' : 'DRY', reason: REASON, targets: TARGETS.length, rows, pass: rows.every((r) => r.pass) };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(out, null, 2));
}
main();
