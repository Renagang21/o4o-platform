/**
 * WO-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-APPLY-TIER2-V1
 *
 * e약은요 유실 SPD(ko canonical) 경계검토 86품목 — 크레아티닌 청소율 값 + 닫는 괄호 +
 * (유실된 경우) 문단 경계 `\n\n` 를 NB_DOC 근거로 복원.
 * dry-run 기본 / apply 는 이중 게이트(`--apply` + DRUG_OTC_NB_RECOVERY_TIER2_CONFIRM=YES).
 *
 * 화이트리스트: docs/investigations/samples/nb-doc-bulk-v1/recovery-whitelist-tier2.json
 *   - 86 item_seq / ko 354 master / en 0 (dry-run CHECK 검증완료)
 *   - 항목별 { item_seq, find, replace, breakSurvived }
 *     · breakSurvived=false(75): replace 끝에 `\n\n` (경계 유실 → 문단 분리 복원)
 *     · breakSurvived=true(11): 값+`)` 만 (`\n\n` 이미 생존 → 삼중개행 방지)
 *
 * 안전:
 *   - 대상 = mfds_easy_drug · canonical · ko · 화이트리스트 item_seq 뿐.
 *   - 예상 86 item_seq / 354 row 와 다르면 ABORT.
 *   - 각 row: find 정확히 1회 + replace 미포함 → apply. 역치환 + 삼중개행(`)\n\n\n`) 0 검증.
 *   - 이미 복원(replace 포함) no-op. INSERT/DELETE·ko 외·타 source_type 미수정. 단일 TX.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const WL_PATH = path.resolve(
  process.cwd(),
  '../../docs/investigations/samples/nb-doc-bulk-v1/recovery-whitelist-tier2.json',
);
const EXPECTED_ITEM_SEQ = 86;
const EXPECTED_ROWS = 354;

interface WLEntry { item_seq: string; ko_masters: number; find: string; replace: string; breakSurvived: boolean; nbValue: string }
const cnt = (h: string, n: string): number => h.split(n).length - 1;

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_NB_RECOVERY_TIER2_CONFIRM === 'YES';
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
    const rows: Array<{ id: string; master_id: string; item_seq: string; content: string }> = await ds.query(
      `SELECT spd.id::text, spd.master_id::text, pi.normalized_value AS item_seq, spd.content
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

    const staged: Array<{ id: string; before: string; after: string }> = [];
    for (const r of rows) {
      const e = bySeq.get(String(r.item_seq));
      if (!e) { report.anomalies.push(`${r.id}: 화이트리스트 매핑 없음`); continue; }
      if (r.content.includes(e.replace)) { report.alreadyRecovered += 1; continue; } // 멱등
      if (cnt(r.content, e.find) !== 1) { report.anomalies.push(`${r.id}(seq ${r.item_seq}): find ${cnt(r.content, e.find)}회 (≠1)`); continue; }
      const after = r.content.replace(e.find, e.replace);
      if (after.replace(e.replace, e.find) !== r.content) { report.anomalies.push(`${r.id}: 역치환 불일치`); continue; }
      if (!after.includes(`${e.nbValue})`)) { report.anomalies.push(`${r.id}: 결과에 값 없음`); continue; }
      if (after.includes(')\n\n\n')) { report.anomalies.push(`${r.id}: 삼중개행`); continue; }
      staged.push({ id: r.id, before: r.content, after });
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
  else console.log(`  (dry-run — write 없음. apply: --apply + DRUG_OTC_NB_RECOVERY_TIER2_CONFIRM=YES)`);
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
