/**
 * 프로덕션 SPD 항목번호 파편 교정 — Batch 001/002 적재분 14 ko STORE canonical content UPDATE.
 *   dry-run: PROXY_PORT=54xx npx tsx src/scripts/hff-frag-spd-correct.ts
 *   apply  : HFF_FRAG_APPLY_CONFIRM=YES PROXY_PORT=54xx npx tsx ... --apply
 *
 * 교정 초안(파편 제거·이미 git 커밋)의 sanitize content 로 ko SPD content 만 UPDATE. en 무영향.
 * status/language/master_id/description_type 무변경. 사후검증 실패시 전체 롤백.
 */
import '../env-loader.js';
import fs from 'node:fs';
import { DataSource } from 'typeorm';
import { sanitizeDescriptionHtml } from '../modules/neture/utils/sanitize-description-html.util.js';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_FRAG_APPLY_CONFIRM === 'YES';
const PROXY_HOST = process.env.PROXY_HOST ?? '127.0.0.1';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5445', 10);
const D = 'C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard';
const SP = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/55e4dd9c-cf70-462e-8114-188f6c53d473/scratchpad';

// 값 종료어 뒤 bare 항목번호가 </div> 직전에 있는가(파편 시그니처)
const FRAG = /(?:이상|음성|CFU|cfu|%|℃|\))\s+\d{1,2}\s*[)．.]?\s*<\/div>/;

async function main(): Promise<void> {
  if (APPLY && !CONFIRM) throw new Error('APPLY_BLOCKED: --apply 는 HFF_FRAG_APPLY_CONFIRM=YES 필요');

  const targets = JSON.parse(fs.readFileSync(`${SP}/frag-targets.json`, 'utf8')).filter((t: any) => t.ko);
  if (targets.length !== 14) throw new Error(`대상 수 불일치: ${targets.length} (기대 14)`);

  // 교정 초안 로드 → 신규 content(sanitize). 초안엔 파편이 없어야.
  const items = targets.map((t: any) => {
    const it = JSON.parse(fs.readFileSync(`${D}/${t.f}`, 'utf8')).find((x: any) => String(x.statementNo) === String(t.stmt));
    const koC = sanitizeDescriptionHtml(it.drafts.ko);
    if (FRAG.test(koC)) throw new Error(`교정 초안에 파편 잔여 ${t.stmt}`);
    return { stmt: String(t.stmt), name: t.name, ko: koC };
  });

  const ds = new DataSource({
    type: 'postgres', host: PROXY_HOST, port: PROXY_PORT,
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'], ssl: false,
  });
  await ds.initialize();
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  const plan: any[] = [];
  try {
    for (const it of items) {
      const master: Array<{ id: string }> = await qr.query(`SELECT id FROM product_masters WHERE mfds_permit_number=$1`, [it.stmt]);
      if (master.length !== 1) throw new Error(`MASTER_AMBIGUOUS ${it.stmt} → ${master.length}`);
      const rows: Array<{ id: string; content: string }> = await qr.query(
        `SELECT id, content FROM shared_product_descriptions
           WHERE master_id=$1 AND description_type='STORE' AND status='canonical' AND language='ko' AND deleted_at IS NULL`, [master[0].id]);
      if (rows.length !== 1) throw new Error(`SPD_KO_AMBIGUOUS ${it.stmt} → ${rows.length}`);
      const row = rows[0];
      // 가드: 현재 content 에 파편이 있어야(교정 대상), 신규엔 없어야, 실제 달라야
      if (!FRAG.test(row.content)) throw new Error(`GUARD: 현재 content 에 파편 없음 ${it.stmt} — 예상과 다름(중단)`);
      if (row.content === it.ko) throw new Error(`GUARD: 변경 없음 ${it.stmt}`);
      plan.push({ spdId: row.id, stmt: it.stmt, name: it.name, oldLen: row.content.length, newLen: it.ko.length, delta: it.ko.length - row.content.length });
      if (APPLY) await qr.query(`UPDATE shared_product_descriptions SET content=$1, updated_at=now() WHERE id=$2`, [it.ko, row.id]);
    }
    let verify: any = '(dry-run: UPDATE 미실행, 롤백)';
    if (APPLY) {
      const ids = plan.map((p) => p.spdId);
      const v = await qr.query(
        `SELECT count(*)::int total, count(*) filter (where language='ko')::int ko, count(*) filter (where status='canonical')::int canonical,
                count(*) filter (where content ~ '(이상|음성|CFU|%)[[:space:]]+[0-9]{1,2}[).．]?[[:space:]]*</div>')::int still_frag
           FROM shared_product_descriptions WHERE id = ANY($1)`, [ids]);
      verify = v[0];
    }
    const report = { mode: APPLY ? 'apply' : 'dry-run', targets: items.length, plannedUpdates: plan.length, rows: plan.map((p) => ({ name: p.name, oldLen: p.oldLen, newLen: p.newLen, delta: p.delta })), verify };

    if (APPLY) {
      if (plan.length !== 14 || verify.total !== 14 || verify.ko !== 14 || verify.canonical !== 14 || verify.still_frag !== 0) {
        await qr.rollbackTransaction();
        console.log('❌ 사후검증 실패 → ROLLBACK', JSON.stringify(verify));
        process.exit(2);
      }
      fs.writeFileSync(`${SP}/frag-spd-rollback.json`, JSON.stringify({ spdIds: plan.map((p) => p.spdId) }, null, 2));
      await qr.commitTransaction();
      console.log('✅ COMMIT 완료 · 롤백정보 → scratchpad/frag-spd-rollback.json');
    } else {
      await qr.rollbackTransaction();
      console.log('dry-run: 트랜잭션 ROLLBACK (DB write 0)');
    }
    console.log('JSON_REPORT_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_REPORT_END');
  } catch (e) {
    try { await qr.rollbackTransaction(); } catch { /* ignore */ }
    throw e;
  } finally {
    await qr.release();
    await ds.destroy();
  }
}
main().catch((e) => { console.error('[hff-frag-spd-correct] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
