/**
 * WO-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-APPLY-MANUAL7-V1
 *
 * 건별 검증 완료된 수동 7품목(크레아티닌 앵커 4 + pH 3) — ko canonical 21건 유실값 복원.
 * dry-run 기본 / apply 는 이중 게이트(`--apply` + DRUG_OTC_NB_RECOVERY_MANUAL7_CONFIRM=YES).
 *
 * 화이트리스트: docs/investigations/samples/nb-doc-bulk-v1/recovery-whitelist-manual7.json
 *   - 7 item_seq / ko 21 master / en 0 (MANUAL7 CHECK 검증완료)
 *   - 크레아티닌 4: find `크레아티닌 청소율이` → +`&lt; 25 mL/min)`[+\n\n] (NB_DOC 근거)
 *   - pH 3: find `(pH` → `(pH &lt; 5.5)` (UD_DOC 근거, 섹션끝 최소복구)
 *
 * 안전: Tier1/2 와 동일 — 예상 7/21 불일치 ABORT · find 1회 · 역치환 · 삼중개행 0 ·
 *       ko canonical 만 · INSERT/DELETE·영문 0 · 단일 TX · 멱등(replace 포함 시 no-op).
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const WL_PATH = path.resolve(
  process.cwd(),
  '../../docs/investigations/samples/nb-doc-bulk-v1/recovery-whitelist-manual7.json',
);
const EXPECTED_ITEM_SEQ = 7;
const EXPECTED_ROWS = 21;

interface WLEntry { item_seq: string; ko_masters: number; find: string; replace: string; nbValue: string; sourceField: string }
const cnt = (h: string, n: string): number => h.split(n).length - 1;

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_NB_RECOVERY_MANUAL7_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const wl = JSON.parse(fs.readFileSync(WL_PATH, 'utf8')) as { entries: WLEntry[]; koUpdateMasters: number; enUpdateMasters: number };
  if (wl.entries.length !== EXPECTED_ITEM_SEQ) throw new Error(`화이트리스트 item_seq ${wl.entries.length} !== ${EXPECTED_ITEM_SEQ}`);
  if (wl.enUpdateMasters !== 0) throw new Error(`enUpdateMasters ${wl.enUpdateMasters} !== 0`);
  const bySeq = new Map(wl.entries.map((e) => [String(e.item_seq), e]));

  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  if (!host) throw new Error('DB_HOST 미설정');
  const ds = new DataSource({
    type: 'postgres', host, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  const report = { mode, targetItemSeq: 0, targetRows: 0, toUpdate: 0, alreadyRecovered: 0, anomalies: [] as string[], updated: 0, verified: 0 };
  try {
    const rows: Array<{ id: string; item_seq: string; content: string }> = await ds.query(
      `SELECT spd.id::text, pi.normalized_value AS item_seq, spd.content
         FROM shared_product_descriptions spd
         JOIN product_identifiers pi ON pi.product_master_id = spd.master_id
              AND pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
        WHERE spd.source_type='mfds_easy_drug' AND spd.status='canonical'
          AND spd.deleted_at IS NULL AND spd.language='ko'
          AND pi.normalized_value = ANY($1::text[])
        ORDER BY pi.normalized_value, spd.id`,
      [wl.entries.map((e) => String(e.item_seq))],
    );
    report.targetItemSeq = new Set(rows.map((r) => r.item_seq)).size;
    report.targetRows = rows.length;

    const staged: Array<{ id: string; after: string }> = [];
    for (const r of rows) {
      const e = bySeq.get(String(r.item_seq));
      if (!e) { report.anomalies.push(`${r.id}: 매핑 없음`); continue; }
      if (r.content.includes(e.replace)) { report.alreadyRecovered += 1; continue; }
      if (cnt(r.content, e.find) !== 1) { report.anomalies.push(`${r.id}(seq ${r.item_seq}): find ${cnt(r.content, e.find)}회`); continue; }
      const after = r.content.replace(e.find, e.replace);
      if (after.replace(e.replace, e.find) !== r.content) { report.anomalies.push(`${r.id}: 역치환 불일치`); continue; }
      if (!after.includes(`${e.nbValue})`)) { report.anomalies.push(`${r.id}: 결과 값 없음`); continue; }
      if (after.includes(')\n\n\n')) { report.anomalies.push(`${r.id}: 삼중개행`); continue; }
      staged.push({ id: r.id, after });
    }
    report.toUpdate = staged.length;

    if (report.targetItemSeq !== EXPECTED_ITEM_SEQ || report.targetRows !== EXPECTED_ROWS) {
      throw new Error(`예상 불일치 — item_seq ${report.targetItemSeq}/${EXPECTED_ITEM_SEQ}, rows ${report.targetRows}/${EXPECTED_ROWS} → ABORT`);
    }
    if (report.anomalies.length > 0) {
      throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.slice(0, 10).join('\n  ')}`);
    }

    if (apply && staged.length > 0) {
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        for (const s of staged) {
          await qr.query(
            `UPDATE shared_product_descriptions SET content=$2, updated_at=NOW()
              WHERE id=$1 AND source_type='mfds_easy_drug' AND status='canonical' AND language='ko' AND deleted_at IS NULL`,
            [s.id, s.after],
          );
          report.updated += 1;
        }
        for (const s of staged) {
          const rr: Array<{ content: string }> = await qr.query(`SELECT content FROM shared_product_descriptions WHERE id=$1`, [s.id]);
          if (rr[0]?.content === s.after && !rr[0].content.includes(')\n\n\n')) report.verified += 1;
        }
        if (report.verified !== staged.length) throw new Error(`사후검증 실패 ${report.verified}/${staged.length} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) {
        await qr.rollbackTransaction();
        throw err;
      } finally {
        await qr.release();
      }
    }
  } finally {
    await ds.destroy();
  }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] 대상 ${report.targetItemSeq} item_seq / ${report.targetRows} row · 복원대상 ${report.toUpdate} · 이미복원 ${report.alreadyRecovered} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  UPDATE ${report.updated} · 사후검증 ${report.verified}/${report.toUpdate}`);
  else console.log(`  (dry-run — write 없음. apply: --apply + DRUG_OTC_NB_RECOVERY_MANUAL7_CONFIRM=YES)`);
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
