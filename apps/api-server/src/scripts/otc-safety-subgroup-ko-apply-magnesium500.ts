/**
 * WO-O4O-OTC-SAFETY-MISMATCH-STORE-LEAFLET-PRODUCTION-NA-V2 — 나. 수산화마그네슘 500mg 정 subgroup KO 매장설명서 생산.
 * grounded: 공식 원문(mfds_easy_drug, easy md5 0c8bcf57, 7 master 균질)에서 효능·용법·주의 **전부 보존** 재구성. 원문 외 의료사실 0.
 * 비민감(비-DR-008) → status='canonical' 자동 apply. 이중게이트: dry-run 기본, --apply + OTC_SAFETY_SUBGROUP_CONFIRM=YES.
 * 안전: INSERT-only(WHERE NOT EXISTS canonical) · target 7 master 한정 · 단일 TX · 사후 canonicalDup 0 & insert==plan 아니면 ROLLBACK.
 * proxy: DB_PORT(기본 5445).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();

const GROUP_KEY = '수산화마그네슘|500밀리그램|정';
const SAFETY_FP = '47b61841f0d337dc';
const SOURCE_REF = 'a7d0e1c2-5f34-4b8a-9c11-2e6f0a3b7d51'; // 고정 provenance UUID(이 subgroup 전용)
const SOURCE_TYPE = 'mfds_drug_otc';
const EXPECT_EASY_MD5 = '0c8bcf57'; // 원문 균질 확인용(앞 8자)
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
    분류: '일반의약품',
    성분: '수산화마그네슘 500mg',
    작용: '제산(위산 중화), 완하(배변 완화)',
    '주요 증상': '위·십이지장궤양, 위염, 위산과다, 변비',
    '주의 대상': '신장애, 설사, 심기능 장애, 고마그네슘혈증',
    '선택 포인트': '위산과다 증상과 변비에 사용하는 제산·완하제',
  },
};

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && process.env.OTC_SAFETY_SUBGROUP_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';
  const built = buildDrugOtcConsumerHtml(CONTENT as never, { title: TITLE });
  const summary = CONTENT.summaryTable['성분'];
  const anomalies: string[] = [];
  if (built.missing.length) anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
  if (!built.html) anomalies.push('빈 html');
  if (built.html.includes('<table')) anomalies.push('<table>');
  if (built.html.includes('<!--')) anomalies.push('주석');
  if (!built.html.includes('sd-warn')) anomalies.push('sd-warn 없음');
  if (SENSITIVE) anomalies.push('DR-008 민감 → needs_review 경로 필요(본 스크립트는 canonical 전용)');

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.DB_PORT || '5445', 10), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  const report: any = { wo: 'WO-O4O-OTC-SAFETY-MISMATCH-STORE-LEAFLET-PRODUCTION-NA-V2', mode, groupKey: GROUP_KEY, safetyFp: SAFETY_FP, T: MASTER_IDS.length, sourceRef: SOURCE_REF, dbWrite: 0, anomalies, htmlLen: built.html.length };
  try {
    // 원문 균질 재확인(오적재 방지): 7 master easy md5 단일 & 기대값 일치
    const md5 = await ds.query(`SELECT md5(content) h, count(*)::int n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [MASTER_IDS]);
    if (md5.length !== 1) anomalies.push(`easy md5 종류 ${md5.length}!=1`);
    else if (!md5[0].h.startsWith(EXPECT_EASY_MD5)) anomalies.push(`easy md5 ${md5[0].h.slice(0, 8)}!=${EXPECT_EASY_MD5}`);
    // 기존 canonical 없음(신규 insert 대상) 확인
    const already = await ds.query(`SELECT count(*)::int n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`, [MASTER_IDS]);
    report.existingKoCanonical = already[0].n;
    const ni = await ds.query(`SELECT count(*)::int n FROM unnest($1::uuid[]) mid WHERE NOT EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)`, [MASTER_IDS]);
    report.planInsert = ni[0].n;

    if (anomalies.length) { report.status = 'ABORT'; console.log(JSON.stringify(report, null, 2)); return; }

    if (apply && report.planInsert > 0) {
      const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
      try {
        const res = await qr.query(
          `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           SELECT mid, $2, $3, $4, $5::uuid, 'canonical', 'ko', 'STORE', now(), now()
           FROM unnest($1::uuid[]) mid
           WHERE NOT EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)
           RETURNING id`, [MASTER_IDS, built.html, summary, SOURCE_TYPE, SOURCE_REF]);
        report.inserted = Array.isArray(res) ? res.length : 0;
        const dup = await qr.query(`SELECT count(*)::int n FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL GROUP BY master_id HAVING count(*)>1) t`, [MASTER_IDS]);
        // target 밖 write 정황: 이 source_ref 로 들어간 row 가 정확히 7 master 인지
        const scope = await qr.query(`SELECT count(*)::int n, count(DISTINCT master_id)::int m FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND deleted_at IS NULL`, [SOURCE_REF]);
        if (dup[0].n > 0) throw new Error(`canonicalDup ${dup[0].n} → ROLLBACK`);
        if (report.inserted !== report.planInsert) throw new Error(`inserted ${report.inserted} != plan ${report.planInsert} → ROLLBACK`);
        if (scope[0].m !== MASTER_IDS.length || scope[0].n !== MASTER_IDS.length) throw new Error(`source_ref scope ${scope[0].n}/${scope[0].m} != ${MASTER_IDS.length} → ROLLBACK`);
        await qr.commitTransaction();
        report.dbWrite = report.inserted; report.status = 'APPLIED'; report.canonicalDup = dup[0].n; report.scopeMasters = scope[0].m;
      } catch (e) { await qr.rollbackTransaction(); report.status = 'ROLLBACK'; report.error = e instanceof Error ? e.message : String(e); }
    } else {
      report.status = report.planInsert === 0 ? 'ALREADY_COMPLETE_NOOP' : 'DRYRUN_PASS';
    }
  } finally { await ds.destroy(); }
  console.log(JSON.stringify(report, null, 2));
  console.log('\n--- rendered KO leaflet (dry-run preview) ---\n' + built.html);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
