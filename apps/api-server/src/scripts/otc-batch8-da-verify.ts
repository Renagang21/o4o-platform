/**
 * WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-B-KO-EN-DA-V1 — 독립검증 (에이전트 다). DB write 0.
 *
 * 선례 otc-clonixin-jeong-verify.ts 의 질의 세트를 번들 4그룹으로 일반화하고
 * **exclude/sibling 불변 증명**을 위해 before/after 스냅샷 대조를 추가했다.
 *   ① target ko canonical == authored(mfds_drug_otc) + 올바른 source_ref_id + easy deprecated + dup 0
 *   ② audit(canonical_replaced, ko) == T
 *   ③ exclude(coarse − target) 전량 easy canonical 유지 · SPD id/status 스냅샷 동일
 *   ④ source_ref 공유 out-of-target master ko/en 스냅샷 동일
 *   ⑤ target en canonical == T · md5 균일 · out en 과 byte-identical
 *
 * Usage: npx tsx src/scripts/otc-batch8-da-verify.ts --phase=before|after
 *        npx tsx src/scripts/otc-batch8-da-verify.ts --compare
 */
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const ENV_PATH = path.resolve(process.cwd(), '.env');
const readPw = (): string => fs.readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const retRows = <T = any>(res: unknown): T[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];

const GROUPS = [
  { slug: 'trimebutine-200mg-jeong', key: '트리메부틴말레산염|200밀리그램|정', ref: '0175e433-a171-44ec-b601-ad65a805171d', T: 13, ing: '트리메부틴말레산염', dose: '200밀리그램', form: '정', koRunBase: 'otc-grounded-upgrade-trimebutine-200mg-jeong' },
  { slug: 'mecobalamin-500ug-capsule', key: '메코발라민|500마이크로그램|캡슐', ref: '0908968f-30c8-4c9b-95ed-5631212adbc9', T: 10, ing: '메코발라민', dose: '500마이크로그램', form: '캡슐', koRunBase: 'otc-grounded-upgrade-mecobalamin-500ug-capsule' },
  { slug: 'dexpanthenol-100mg-jeong', key: '덱스판테놀|100밀리그램|정', ref: '0d2b2ef8-cce5-4771-9ed7-159fd10c1715', T: 9, ing: '덱스판테놀', dose: '100밀리그램', form: '정', koRunBase: 'otc-grounded-upgrade-dexpanthenol-100mg-jeong' },
  { slug: 'folic-acid-1mg-jeong', key: '폴산|1밀리그램|정', ref: '068e2176-ee92-4e94-a47d-2dc632bacf53', T: 9, ing: '폴산', dose: '1밀리그램', form: '정', koRunBase: 'otc-grounded-upgrade-folic-acid-1mg-jeong' },
];

const snapPath = (phase: string): string => path.join(DATA_DIR, `otc-batch8-da-verify.${phase}.json`);

async function snapshot(phase: string): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();
  const out: any = { wo: 'WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-B-KO-EN-DA-V1', phase, readOnly: true, dbWrite: 0, groups: {} };
  try {
    for (const g of GROUPS) {
      const TARGET: string[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${g.koRunBase}.run.json`), 'utf8')).rollback_master_ids;

      const koState = retRows(await ds.query(`
        SELECT
          count(*) FILTER (WHERE canoncnt=1)::int canon1,
          count(*) FILTER (WHERE authored)::int authored,
          count(*) FILTER (WHERE right_ref)::int right_ref,
          count(*) FILTER (WHERE dep_easy)::int dep_easy,
          count(*) FILTER (WHERE easy_canon)::int easy_canon,
          count(*) FILTER (WHERE canoncnt>1)::int dup
        FROM (
          SELECT mid,
            (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) canoncnt,
            EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_drug_otc' AND s.deleted_at IS NULL) authored,
            EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_drug_otc' AND s.source_ref_id=$2::uuid AND s.deleted_at IS NULL) right_ref,
            EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_easy_drug' AND s.deleted_at IS NULL) easy_canon,
            EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy
          FROM unnest($1::uuid[]) mid
        ) t`, [TARGET, g.ref]))[0];

      const audit = retRows(await ds.query(
        `SELECT count(*)::int n FROM shared_product_description_audit_logs
         WHERE master_id = ANY($1::uuid[]) AND event_type='canonical_replaced' AND description_type='STORE' AND language='ko'
           AND metadata->>'source_ref_id'=$2`, [TARGET, g.ref]))[0];

      // exclude = coarse(동일 성분·함량·제형 keyword) − target. SPD id/status 까지 스냅샷.
      const exclude = retRows(await ds.query(`
        SELECT pm.id::text mid,
          (SELECT s.id::text FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL LIMIT 1) spd_id,
          (SELECT s.source_type FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL LIMIT 1) ko_src
        FROM product_masters pm
        WHERE pm.name LIKE '%('||$2||')' AND split_part(pm.specification,' / ',1)=$3 AND pm.name LIKE '%'||$4||'%'
          AND pm.id <> ALL($1::uuid[])
        ORDER BY pm.id`, [TARGET, g.ing, g.dose, g.form]));

      // source_ref 공유 out-of-target master ko/en 스냅샷
      const outSib = retRows(await ds.query(`
        SELECT master_id::text mid, COALESCE(language,'ko') lang, status, md5(content) h
        FROM shared_product_descriptions
        WHERE source_ref_id=$1::uuid AND description_type='STORE' AND deleted_at IS NULL AND master_id <> ALL($2::uuid[])
        ORDER BY master_id, lang, status`, [g.ref, TARGET]));

      const enState = retRows(await ds.query(`
        SELECT count(DISTINCT master_id)::int masters_with_en,
               count(*) FILTER (WHERE status='canonical')::int en_canon,
               count(*) FILTER (WHERE status='needs_review')::int en_nr
        FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL`, [TARGET]))[0];
      const enMd5 = retRows(await ds.query(`
        SELECT md5(content) h, count(*)::int n FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [TARGET]));
      const koMd5 = retRows(await ds.query(`
        SELECT md5(content) h, count(*)::int n FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [TARGET]));

      out.groups[g.slug] = { groupKey: g.key, T: g.T, targetN: TARGET.length, koState, audit_n: audit.n, excludeN: exclude.length, exclude, outSibN: outSib.length, outSib, enState, enMd5, koMd5 };
      console.log(`[${phase}] ${g.slug}: koCanon1=${koState.canon1} authored=${koState.authored} rightRef=${koState.right_ref} easyCanon=${koState.easy_canon} depEasy=${koState.dep_easy} dup=${koState.dup} audit=${audit.n} exclude=${exclude.length} outSib=${outSib.length} enCanon=${enState.en_canon}`);
    }
  } finally { await ds.destroy(); }
  fs.writeFileSync(snapPath(phase), JSON.stringify(out, null, 2), 'utf8');
  console.log('written', snapPath(phase));
}

function compare(): void {
  const before = JSON.parse(fs.readFileSync(snapPath('before'), 'utf8'));
  const after = JSON.parse(fs.readFileSync(snapPath('after'), 'utf8'));
  const probe = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-batch8-da-probe.json'), 'utf8'));
  const result: any = { wo: before.wo, readOnly: true, dbWrite: 0, groups: {} };
  let fail = 0;
  for (const g of GROUPS) {
    const b = before.groups[g.slug], a = after.groups[g.slug];
    const refEn = probe.groups[g.slug].refEnCanonical[0];
    const refKoMd5 = probe.groups[g.slug].refKoCanonical[0]?.md5;
    const checks: Record<string, boolean> = {
      target_count: a.targetN === g.T,
      ko_canonical_exactly_1: a.koState.canon1 === g.T,
      ko_canonical_authored: a.koState.authored === g.T,
      ko_right_source_ref: a.koState.right_ref === g.T,
      ko_easy_deprecated: a.koState.dep_easy === g.T,
      ko_no_easy_canonical_left: a.koState.easy_canon === 0,
      canonicalDup_0: a.koState.dup === 0,
      audit_rows_eq_T: a.audit_n === g.T,
      ko_md5_uniform: a.koMd5.length === 1 && a.koMd5[0].n === g.T,
      ko_md5_matches_out_sibling: a.koMd5[0]?.h === refKoMd5,
      en_canonical_eq_T: a.enState.en_canon === g.T,
      en_needs_review_0: a.enState.en_nr === 0,
      en_md5_uniform: a.enMd5.length === 1 && a.enMd5[0].n === g.T,
      en_md5_byte_identical_to_out: a.enMd5[0]?.h === refEn?.md5,
      exclude_set_unchanged: JSON.stringify(b.exclude) === JSON.stringify(a.exclude),
      // before 에서 easy canonical 이던 비대상은 after 에도 easy canonical 유지(승격 누출 0)
      exclude_easy_ones_still_easy: b.exclude
        .filter((r: any) => r.ko_src === 'mfds_easy_drug')
        .every((r: any) => a.exclude.find((x: any) => x.mid === r.mid)?.ko_src === 'mfds_easy_drug'),
      out_sibling_unchanged: JSON.stringify(b.outSib) === JSON.stringify(a.outSib),
      before_was_clean_easy: b.koState.easy_canon === g.T && b.koState.authored === 0 && b.audit_n === 0 && b.enState.en_canon === 0,
    };
    const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    if (failed.length) fail += 1;
    result.groups[g.slug] = { groupKey: g.key, T: g.T, checks, failed, verdict: failed.length ? 'FAIL' : 'PASS' };
    console.log(`${g.slug}: ${failed.length ? 'FAIL → ' + failed.join(',') : 'PASS (전 항목)'}`);
  }
  result.status = fail === 0 ? 'PASS' : 'FAIL';
  result.failGroups = fail;
  fs.writeFileSync(path.join(DATA_DIR, 'otc-batch8-da-verify.compare.json'), JSON.stringify(result, null, 2), 'utf8');
  console.log(`\nVERIFY ${result.status} (fail ${fail}/4)`);
  if (fail) process.exit(1);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes('--compare')) { compare(); return; }
  const phase = (argv.find((x) => x.startsWith('--phase=')) || '').split('=')[1];
  if (phase !== 'before' && phase !== 'after') { console.error('--phase=before|after 또는 --compare'); process.exit(2); }
  await snapshot(phase);
}
main().catch((e) => { console.error('FAIL', e instanceof Error ? e.message : e); process.exit(1); });
