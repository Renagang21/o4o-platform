/**
 * 프로덕션 SPD 음용수 교정 — 리부트 클렌즈·순창 쉴 (STORE canonical ko/en = 4행 content UPDATE)
 *   dry-run: PROXY_PORT=5437 npx tsx src/scripts/hff-eumyong-spd-correct.ts
 *   apply  : HFF_EUMYONG_APPLY_CONFIRM=YES PROXY_PORT=5437 npx tsx ... --apply
 *
 * 원문 "음용수와 함께"인데 적재분 content 에 vehicle 칩 누락 → 교정 초안(음용수 칩)으로 content 만 UPDATE.
 * status/language/master_id/description_type 등 다른 필드·canonical 상태 무변경.
 */
import '../env-loader.js';
import fs from 'node:fs';
import { DataSource } from 'typeorm';
import { sanitizeDescriptionHtml } from '../modules/neture/utils/sanitize-description-html.util.js';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_EUMYONG_APPLY_CONFIRM === 'YES';
const PROXY_HOST = process.env.PROXY_HOST ?? '127.0.0.1';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5437', 10);
const D = 'C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard';
const SP = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/55e4dd9c-cf70-462e-8114-188f6c53d473/scratchpad';

// (파일, 신고번호)
const TARGETS = [
  ['hff-probiotics-prod-a-cp04.json', '2015001001887'],
  ['hff-probiotics-prod-a-cp09.json', '20150010018118'],
];

async function main(): Promise<void> {
  if (APPLY && !CONFIRM) throw new Error('APPLY_BLOCKED: --apply 는 HFF_EUMYONG_APPLY_CONFIRM=YES 필요');

  // 교정 초안 로드 → 신규 content(sanitize)
  const items: Array<{ stmt: string; name: string; ko: string; en: string }> = [];
  for (const [f, stmt] of TARGETS) {
    const it = JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8')).find((x: any) => String(x.statementNo).trim() === stmt);
    if (!it) throw new Error(`JSON 대상 없음 ${stmt}`);
    if (!/음용수/.test(it.drafts.ko) || !/drinking water/i.test(it.drafts.en)) throw new Error(`교정 초안에 음용수 칩 없음 ${stmt}`);
    items.push({ stmt, name: it.productName, ko: sanitizeDescriptionHtml(it.drafts.ko), en: sanitizeDescriptionHtml(it.drafts.en) });
  }

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
      const rows: Array<{ id: string; language: string; content: string }> = await qr.query(
        `SELECT id, language, content FROM shared_product_descriptions
           WHERE master_id=$1 AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, [master[0].id]);
      const byLang = new Map(rows.map((r) => [r.language, r]));
      for (const lang of ['ko', 'en'] as const) {
        const row = byLang.get(lang);
        if (!row) throw new Error(`SPD_MISSING ${it.stmt} ${lang}`);
        const newContent = lang === 'ko' ? it.ko : it.en;
        const curHasVeh = /음용수|물과\s*함께|with (drinking )?water/i.test(row.content);
        const newHasVeh = /음용수|drinking water/i.test(newContent);
        // 가드: 현재는 vehicle 누락 상태여야, 신규는 음용수 포함이어야, 그리고 실제로 다름
        if (curHasVeh) throw new Error(`GUARD: 현재 content 에 이미 vehicle 존재 ${it.stmt} ${lang} — 예상과 다름(중단)`);
        if (!newHasVeh) throw new Error(`GUARD: 신규 content 에 음용수 없음 ${it.stmt} ${lang}`);
        if (newContent === row.content) throw new Error(`GUARD: 변경 없음 ${it.stmt} ${lang}`);
        plan.push({ spdId: row.id, stmt: it.stmt, name: it.name, lang, oldLen: row.content.length, newLen: newContent.length, delta: newContent.length - row.content.length, newContent });
        if (APPLY) {
          await qr.query(`UPDATE shared_product_descriptions SET content=$1, updated_at=now() WHERE id=$2`, [newContent, row.id]);
        }
      }
    }
    // 사후검증(트랜잭션 내, apply)
    let verify: any = '(dry-run: UPDATE 미실행, 롤백)';
    if (APPLY) {
      const ids = plan.map((p) => p.spdId);
      const v = await qr.query(
        `SELECT count(*)::int total,
                count(*) filter (where (language='ko' and content like '%음용수%') or (language='en' and content ilike '%drinking water%'))::int has_vehicle,
                count(*) filter (where language='ko')::int ko, count(*) filter (where language='en')::int en,
                count(*) filter (where status='canonical')::int canonical
           FROM shared_product_descriptions WHERE id = ANY($1)`, [ids]);
      verify = v[0];
    }
    const report = { mode: APPLY ? 'apply' : 'dry-run', targets: items.length, plannedUpdates: plan.length, rows: plan.map((p) => ({ spdId: p.spdId, name: p.name, lang: p.lang, oldLen: p.oldLen, newLen: p.newLen, delta: p.delta })), verify };

    if (APPLY) {
      if (plan.length !== 4 || verify.has_vehicle !== 4 || verify.canonical !== 4 || verify.ko !== 2 || verify.en !== 2) {
        await qr.rollbackTransaction();
        console.log('❌ 사후검증 실패 → ROLLBACK', JSON.stringify(verify));
        process.exit(2);
      }
      fs.writeFileSync(`${SP}/eumyong-spd-rollback.json`, JSON.stringify({ spdIds: plan.map((p) => p.spdId), note: 'content UPDATE 만 수행, 이전 content 는 git 초안 교정 이력으로 복원 가능' }, null, 2));
      await qr.commitTransaction();
      console.log('✅ COMMIT 완료 · 롤백정보 → scratchpad/eumyong-spd-rollback.json');
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
main().catch((e) => { console.error('[hff-eumyong-spd-correct] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
