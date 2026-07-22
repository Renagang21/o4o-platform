/**
 * WO-O4O-OTC-SAFETY-MISMATCH-APPLY-DEMOTE-INSERT-AUDIT-FIX-NA-V2 — 나. 수산화마그네슘 500mg 정 subgroup KO 매장설명서 생산.
 * grounded: 공식 원문(mfds_easy_drug, easy md5 0c8bcf57, 7 master 균질)에서 효능·용법·주의 **전부 보존** 재구성. 원문 외 의료사실 0.
 *
 * ⚠️ 설계정정(main 파일럿 검출): SAFETY_MISMATCH 잔여는 **easy-canonical 베이스라인**. 이전 INSERT-only(WHERE NOT EXISTS canonical)는
 *    planInsert=0 영구 no-op(저작본이 canonical 로 안 올라감). → batch-8 grounded-upgrade 검증패턴(demote easy + insert authored + audit) 복제.
 *
 * 단일 TX 계약: ① 기존 mfds_easy_drug KO canonical → deprecated(UPDATE, 본문 덮어쓰지 않음/별도 row)
 *   ② authored KO canonical INSERT(source_type=mfds_drug_otc, source_ref=subgroup provenance) ③ canonical_replaced audit INSERT.
 * 이중게이트: dry-run 기본, --apply + OTC_SAFETY_SUBGROUP_CONFIRM=YES. 비민감→canonical flip, 민감(DR-008)→needs_review 보류.
 * 사후검증(실패 시 전체 ROLLBACK): before easy canonical=T & authored=0 · after easy deprecated=T · authored canonical=T ·
 *   audit=T · canonicalDup(ko·en)=0 · source_ref scope==T · EN canonical drift=0 · writePlan==writeActual · target 밖 write=0.
 * 재실행 no-op: 이미 authored canonical & easy deprecated → STEP A insert 0, STEP B per-master skip, write 0 (ALREADY_COMPLETE_NOOP).
 * ko write = stepA insert T + demote T + flip T + audit T (=4T). EN 은 별도 2T(본 스크립트 범위 밖). proxy: DB_PORT(기본 5445).
 * 실행(main): DB_PORT=5445 OTC_SAFETY_SUBGROUP_CONFIRM=YES npx tsx src/scripts/otc-safety-subgroup-ko-apply-magnesium500.ts --apply
 */
import { readFileSync } from 'node:fs';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();

const GROUP_KEY = '수산화마그네슘|500밀리그램|정';
const SAFETY_FP = '47b61841f0d337dc';
const SOURCE_REF = 'a7d0e1c2-5f34-4b8a-9c11-2e6f0a3b7d51'; // 고정 provenance UUID(이 subgroup 전용, SPD.source_ref_id 무-FK)
const SOURCE_TYPE = 'mfds_drug_otc';
const EASY_SOURCE = 'mfds_easy_drug';
const AUTHORED = ['mfds_drug_otc', 'nutrition_combo'];
const EXPECT_EASY_MD5 = '0c8bcf57';
const TITLE = '마그밀정 (수산화마그네슘 500mg)';
const SENSITIVE = false; // 제산·완하제, DR-008 아님
const MASTER_IDS = [
  '2be1ca7c-07d4-410d-a8ef-3e82fa31535e', '431b31fe-f389-4800-9c54-2607fe585a4c',
  '5297ee7e-2089-440c-b079-e6178e433085', '6351ae13-8687-4712-8c58-821af40348fc',
  'a4adc65c-717b-442e-99c4-31e9c496c09c', 'c43d7263-2504-4515-8e48-b195f9ea6f19',
  'f6d8039b-0859-4dd1-a669-d97aaa5cc75a',
];

// ── grounded content_json (공식 원문 보존 재구성, 원문 외 의료사실 0) ──
const CONTENT = {
  efficacy: '이 약은 위·십이지장궤양, 위염, 위산과다에서 위산을 중화(제산)하여 증상을 개선하고, 변비에 사용합니다.',
  usage: [
    '위·십이지장궤양, 위염, 위산과다: 산화마그네슘으로서 1일 2~5정(1~2.5 g)을 여러 차례 나누어 복용합니다.',
    '변비: 1일 2~4정(1~2 g)을 1~2회 나누어 복용합니다.',
    '연령과 증상에 따라 용량을 적절히 조절합니다.',
  ].join('\n\n'),
  usageLabel: '복용 안내',
  caution: [
    '다음 환자는 이 약을 복용하지 마십시오: 신장애 환자, 설사 환자.',
    '이 약을 복용하기 전에 심기능 장애, 고마그네슘혈증 환자는 의사 또는 약사와 상의하십시오.',
    '테트라사이클린계 항생물질과 함께 복용하지 마십시오.',
    '다량의 우유나 칼슘제제와 함께 복용하면 우유·알칼리 증후군(고칼슘혈증, 고질소혈증, 알칼리증 등)이 나타날 수 있으므로 의사 또는 약사와 상의하십시오.',
    '마그네슘 중독 증상이나 때때로 설사가 나타날 수 있습니다.',
    '습기와 빛을 피해 실온에서 보관하고, 어린이의 손이 닿지 않는 곳에 보관하십시오.',
    '이 설명서는 제품 선택을 돕기 위한 안내이며, 정확한 복용법과 주의사항은 매장 내 약사 등 전문가와 상의하십시오.',
  ].join('\n\n'),
  summaryTable: {
    분류: '일반의약품', 성분: '수산화마그네슘 500mg', 작용: '제산(위산 중화), 완하(배변 완화)',
    '주요 증상': '위·십이지장궤양, 위염, 위산과다, 변비', '주의 대상': '신장애, 설사, 심기능 장애, 고마그네슘혈증',
    '선택 포인트': '위산과다 증상과 변비에 사용하는 제산·완하제',
  },
};

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && process.env.OTC_SAFETY_SUBGROUP_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';
  const T = MASTER_IDS.length;
  const built = buildDrugOtcConsumerHtml(CONTENT as never, { title: TITLE });
  const summary = CONTENT.summaryTable['성분'];
  const anomalies: string[] = [];
  if (new Set(MASTER_IDS).size !== T) anomalies.push('master_id 중복');
  if (built.missing.length) anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
  if (!built.html) anomalies.push('빈 html');
  if (built.html.includes('<table')) anomalies.push('<table>');
  if (built.html.includes('<!--')) anomalies.push('주석');
  if (!built.html.includes('sd-warn')) anomalies.push('sd-warn 없음');

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.DB_PORT || '5445', 10), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  const report: any = { wo: 'WO-O4O-OTC-SAFETY-MISMATCH-APPLY-DEMOTE-INSERT-AUDIT-FIX-NA-V2', mode, groupKey: GROUP_KEY, safetyFp: SAFETY_FP, T, sourceRef: SOURCE_REF, sensitive: SENSITIVE, dbWrite: 0, anomalies, htmlLen: built.html.length };
  try {
    // 원문 균질 재확인(오적재 방지)
    const md5 = await ds.query(`SELECT md5(content) h FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [MASTER_IDS]);
    if (md5.length !== 1) anomalies.push(`easy md5 종류 ${md5.length}!=1`);
    else if (!md5[0].h.startsWith(EXPECT_EASY_MD5)) anomalies.push(`easy md5 ${md5[0].h.slice(0, 8)}!=${EXPECT_EASY_MD5}`);

    // ── BEFORE 스냅샷 ──
    const slot = await ds.query(`SELECT mid::text mid, (SELECT s.source_type FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL LIMIT 1) src FROM unnest($1::uuid[]) mid`, [MASTER_IDS]);
    const easyCanonBefore = slot.filter((r: any) => r.src === EASY_SOURCE).length;
    const authoredCanonBefore = slot.filter((r: any) => r.src && AUTHORED.includes(r.src)).length;
    const noneCanonBefore = slot.filter((r: any) => !r.src).length;
    const otherCanonBefore = slot.filter((r: any) => r.src && r.src !== EASY_SOURCE && !AUTHORED.includes(r.src)).length;
    const enCanonBefore = (await ds.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND description_type='STORE' AND language='en' AND deleted_at IS NULL`, [MASTER_IDS]))[0].n;
    report.before = { targetMasters: slot.length, easyCanonical: easyCanonBefore, authoredKoCanonical: authoredCanonBefore, noneCanonical: noneCanonBefore, otherCanonical: otherCanonBefore, enCanonical: enCanonBefore };
    if (slot.length !== T) anomalies.push(`target master ${slot.length}!=${T}`);
    if (noneCanonBefore > 0) anomalies.push(`canonical 없음 ${noneCanonBefore}`);
    if (otherCanonBefore > 0) anomalies.push(`예상밖 canonical source ${otherCanonBefore}`);

    const isNoop = authoredCanonBefore === T;          // 재실행(이미 완료)
    const isFresh = easyCanonBefore === T && authoredCanonBefore === 0; // 최초 apply
    if (!isNoop && !isFresh) anomalies.push(`혼재 상태 easy=${easyCanonBefore} authored=${authoredCanonBefore} (fresh/noop 아님)`);
    report.writePlan = isNoop ? 0 : 4 * T; // stepA insert + demote + flip + audit
    report.reexecNoop = isNoop;

    if (anomalies.length) { report.status = 'ABORT'; console.log(JSON.stringify(report, null, 2)); return; }
    if (!apply) { report.status = isNoop ? 'ALREADY_COMPLETE_NOOP' : 'DRYRUN_PASS'; console.log(JSON.stringify(report, null, 2)); console.log('\n--- rendered KO leaflet ---\n' + built.html); return; }

    const qr = ds.createQueryRunner(); await qr.connect();
    // STEP A: authored needs_review 준비(멱등) — easy 본문을 덮어쓰지 않고 별도 row INSERT
    await qr.startTransaction();
    try {
      const insA = await qr.query(
        `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
         SELECT mid, $3, $4, $2, $5::uuid, 'needs_review', 'ko', 'STORE', now(), now()
         FROM unnest($1::uuid[]) mid
         WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.status IN ('canonical','needs_review'))
         RETURNING id`, [MASTER_IDS, SOURCE_TYPE, built.html, summary, SOURCE_REF]);
      report.stepA_inserted = Array.isArray(insA) ? insA.length : 0;
      await qr.commitTransaction();
    } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }

    if (SENSITIVE) { // DR-008: needs_review 보류, canonical flip 금지 (easy canonical 유지)
      report.status = 'NEEDS_REVIEW_HELD'; report.dbWrite = report.stepA_inserted; report.writeActual = report.stepA_inserted; await qr.release();
      console.log(JSON.stringify(report, null, 2)); return;
    }

    // STEP B: 단일 TX — demote easy(UPDATE status→deprecated) + flip authored(needs_review→canonical) + audit canonical_replaced
    await qr.startTransaction();
    try {
      let demoted = 0, flipped = 0, audited = 0;
      for (const mid of MASTER_IDS) {
        const cur = await qr.query(`SELECT id::text id, source_type FROM shared_product_descriptions WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [mid]);
        if (cur.length === 0) throw new Error(`master ${mid} canonical 0 → ABORT`);
        if (cur.length > 1) throw new Error(`master ${mid} canonical ${cur.length} → ABORT`);
        if (AUTHORED.includes(cur[0].source_type)) continue; // 이미 authored → no-op(재실행)
        if (cur[0].source_type !== EASY_SOURCE) throw new Error(`master ${mid} canonical source ${cur[0].source_type} 예상밖 → ABORT`);
        const easyId = cur[0].id;
        const demote = await qr.query(`UPDATE shared_product_descriptions SET status='deprecated', updated_at=now() WHERE id=$1::uuid AND status='canonical' RETURNING id`, [easyId]);
        if (demote.length !== 1) throw new Error(`master ${mid} demote ${demote.length}!=1 → ABORT`); demoted++;
        const flip = await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND status='needs_review' AND deleted_at IS NULL RETURNING id`, [mid]);
        const newId = flip[0]?.id;
        if (flip.length !== 1 || !newId) throw new Error(`master ${mid} flip ${flip.length} → ABORT`); flipped++;
        await qr.query(`INSERT INTO shared_product_description_audit_logs (event_type, description_type, master_id, language, previous_description_id, new_description_id, previous_status, new_status, metadata, performed_at)
           VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb, now())`,
          [mid, easyId, newId, JSON.stringify({ targetMaster: mid, beforeSource: EASY_SOURCE, afterSource: SOURCE_TYPE, previousDemotedTo: 'deprecated', source_ref_id: SOURCE_REF, groupKey: GROUP_KEY, safetyFp: SAFETY_FP, reason: 'safety-subgroup grounded 매장용 설명서 canonical 승격(easy→authored, 원문 보존 재구성)', wo: report.wo })]);
        audited++;
      }
      // ── AFTER 사후검증 ──
      const post = (await qr.query(`SELECT
          count(*) FILTER (WHERE canoncnt=1)::int canon1, count(*) FILTER (WHERE authored_canon)::int authored,
          count(*) FILTER (WHERE dep_easy)::int dep, count(*) FILTER (WHERE canoncnt>1)::int dup,
          count(*) FILTER (WHERE en_dup)::int en_dup, count(*) FILTER (WHERE easy_canon_left)::int easy_left
        FROM (SELECT mid,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) canoncnt,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL) authored_canon,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy,
          ((SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL)>1) en_dup,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) easy_canon_left
          FROM unnest($1::uuid[]) mid) t`, [MASTER_IDS]))[0];
      const scope = (await qr.query(`SELECT count(*)::int n, count(DISTINCT master_id)::int m FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND status='canonical' AND deleted_at IS NULL`, [SOURCE_REF]))[0];
      const outside = (await qr.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND deleted_at IS NULL AND NOT master_id=ANY($2::uuid[])`, [SOURCE_REF, MASTER_IDS]))[0];
      const auditN = (await qr.query(`SELECT count(*)::int n FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND event_type='canonical_replaced' AND (metadata->>'source_ref_id')=$2`, [MASTER_IDS, SOURCE_REF]))[0];
      const enCanonAfter = (await qr.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND description_type='STORE' AND language='en' AND deleted_at IS NULL`, [MASTER_IDS]))[0].n;
      const writeActual = report.stepA_inserted + demoted + flipped + audited;
      report.after = { canonical1: post.canon1, authoredKoCanonical: post.authored, easyDeprecated: post.dep, easyCanonicalLeft: post.easy_left, canonicalDupKo: post.dup, canonicalDupEn: post.en_dup, sourceRefScopeMasters: scope.m, sourceRefRows: scope.n, targetOutsideWrite: outside.n, audit: auditN.n, enCanonical: enCanonAfter };
      report.writeActual = { spd: { stepA: report.stepA_inserted, demoted, flipped }, audit: audited, total: writeActual };
      const fails: string[] = [];
      if (post.canon1 !== T) fails.push(`canon1=${post.canon1}`);
      if (post.authored !== T) fails.push(`authored=${post.authored}`);
      if (post.dep !== T) fails.push(`easyDeprecated=${post.dep}`);
      if (post.easy_left !== 0) fails.push(`easyCanonLeft=${post.easy_left}`);
      if (post.dup !== 0) fails.push(`koDup=${post.dup}`);
      if (post.en_dup !== 0) fails.push(`enDup=${post.en_dup}`);
      if (scope.m !== T || scope.n !== T) fails.push(`sourceRefScope=${scope.n}/${scope.m}`);
      if (outside.n !== 0) fails.push(`targetOutsideWrite=${outside.n}`);
      if (auditN.n !== T) fails.push(`audit=${auditN.n}`);
      if (enCanonAfter !== enCanonBefore) fails.push(`enDrift ${enCanonBefore}->${enCanonAfter}`);
      if (writeActual !== report.writePlan) fails.push(`writePlan ${report.writePlan}!=actual ${writeActual}`);
      if (fails.length) throw new Error(`사후검증 실패 [${fails.join(', ')}] → ROLLBACK`);
      await qr.commitTransaction();
      report.status = 'APPLIED'; report.dbWrite = writeActual;
    } catch (e) { await qr.rollbackTransaction(); await qr.release(); report.status = 'ROLLBACK'; report.error = e instanceof Error ? e.message : String(e); console.log(JSON.stringify(report, null, 2)); return; }
    await qr.release();
  } finally { await ds.destroy(); }
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
