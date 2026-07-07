/**
 * 영양제류 복합제 pass 20 → shared_product_descriptions(status='canonical') 승격 apply 스크립트
 *
 * WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-CANONICAL-PROMOTION-SCRIPT-V1
 * 선행: REVIEW-PREP CHECK(455892206) / CANONICAL-APPLY-V1 dry-run
 *
 * 정책(사용자 확정):
 *   - REVIEW-PREP 검수 통과(pass) 20건은 검수 완료로 본다 → 신규 SPD 는 status='canonical' 로 INSERT.
 *   - canonical 부재 master 에만 신규 INSERT. 기존 canonical 보유 master 는 보존(UPDATE 금지).
 *   - master 당 canonical 1개(partial unique) 계약 준수. needs_review 중간 적재 없음.
 *   - excluded 3건(#1 a12cc 5mg / #12 a11db subgroup / #14 a11ex 제목충돌)은 완전 제외.
 *
 * ⚠️ Enumeration 안전 게이트 (핵심):
 *   draft 생성 시 그룹별 master ID 집합이 seed_json 에 저장되지 않았고(그룹 축=atc7+조성+제형),
 *   조성/강도 분류기가 커밋되어 있지 않아 combo/강도밴드 그룹의 정확한 master 집합을
 *   재현할 수 없다. 따라서 본 스크립트는 재현 가능한 축(atc7 + name-parsed doseForm)으로만
 *   master 를 전개하고, 재현 수가 seed_json.groupScope.masterTotal 과 **정확히 일치**하는
 *   그룹만 ELIGIBLE(insert 대상)로 판정한다. 불일치 그룹은 ENUM_MISMATCH 로 차단한다
 *   (틀린 master 에 대량 canonical 을 붙이는 사고 방지).
 *
 * DB write 게이트:
 *   - 실제 INSERT 는 `--apply` AND 환경변수 DRUG_OTC_NUTRITION_COMBO_CANONICAL_APPLY_CONFIRM=YES
 *     둘 다 있을 때만. 그 외에는 dry-run(SELECT only, DB write 0).
 *   - 본 WO(SCRIPT-V1) 는 dry-run 까지만 사용. 실제 write 는 후속 apply WO.
 *
 * 재실행 안전(idempotency):
 *   - 그룹 master 중 (source_type=PROMOTION_SOURCE_TYPE AND source_ref_id=candidate_id AND status='canonical')
 *     SPD 가 이미 있으면 그 master 는 already-applied 로 no-op.
 *
 * Usage(dry-run):
 *   DB_HOST=127.0.0.1 DB_PORT=5433 DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
 *     npx tsx src/scripts/drug-otc-nutrition-combo-canonical-promotion.ts
 */

const RUN_ID = 'otc-nutrition-combo-draft-v1';
const SOURCE_LABEL = 'MFDS_DRUG_OTC';
/** 승격 SPD source_type. entity union 은 'mfds_easy_drug' 를 이미 포함(파생 출처 동일) → 신규 enum 추가 불필요. */
const PROMOTION_SOURCE_TYPE = 'mfds_easy_drug';
const PROMOTION_LANGUAGE = 'ko';

/** REVIEW-PREP CHECK 의 pass 20 candidate_id (SSOT: CHECK-...-REVIEW-CANONICAL-PREP-V1 §5) */
const PASS_CANDIDATE_IDS: string[] = [
  '79a515f0-fb13-4b58-a01b-3f1b524c29f0', // 비오틴 5mg
  'fcf616ee-339e-489f-9672-a431489fb1ac', // 종합 A·B군·C·D·E (tablet)
  '270a10a2-70a3-4a04-a370-9b5316c4a0b4', // 종합 A·B군·C·E (soft_capsule)
  '1121423d-e606-4671-ac08-c4baf7464439', // 종합 A·D·B군 (tablet)
  '5a342fe9-1cdf-49c1-863d-84654d433720', // 종합 A·E·B군·C (soft_capsule)
  'db7c085e-d233-499c-bb99-56f2e9efcd58', // B1·B2·B6·C
  '41fc4904-171e-43c2-b923-1a120c1c12de', // Mg·B2·B6 액제
  '738fce8e-2eeb-4a9c-901f-88e0b783209d', // Mg·B6 290mg급
  '91d2a67d-669c-418d-840a-e065e311acc1', // Mg·B6 470mg급
  '8b8ad3b4-eb43-4d52-b284-eac2a7de194e', // Mg·B6 940mg급
  '26c2af33-f6ba-4a09-a686-da8c98137aff', // 종합 B군·C·D·E+아연 A11JC (tablet) #13
  '6f143bbc-ff49-4ffc-9271-42e50cf2e84d', // 비타민 C 1000mg
  '2bb82579-3b25-402f-81b8-1a6c6280bc2c', // 칼슘·D
  'b21c54a6-e248-477f-bc23-f5f1a6701587', // 종합 D·E·B군·C+아연 A11JB (tablet)
  'b96f3977-94ff-4deb-bc0a-10f2945cc92c', // D·E·C
  '6343c0f5-cfe9-434b-925a-d42ae1cc86d8', // 비타민 E 1000 IU
  'cda011db-9d62-4b58-aa56-d5a03bcafa83', // 비타민 E 100 IU
  '03751234-7793-4635-8043-26257b32a3fd', // 비타민 E 400 IU
  '029b8650-257b-47bb-ae3e-a42444c39d93', // 종합 E·B군+Mg A11JB (soft_capsule)
  'd29b1340-498e-4128-b6e1-b667e0135035', // 종합 E·B군+Mg·아연 A11JC (soft_capsule)
];

/** 절대 제외 3건 (승격 금지) */
const EXCLUDED_CANDIDATE_IDS: string[] = [
  'a3c46e34-bb63-41a9-a38b-d96a613c6a12', // #1  a12cc 5mg 이상치
  '1eb608e0-9a4a-4489-8866-b9512fa913b9', // #12 a11db subgroup_pending
  'd5265213-034c-4999-929b-c8780c3e0830', // #14 a11ex 제목충돌
];

interface DraftRow {
  candidate_id: string;
  title: string;
  content_html: string | null;
  content_json: Record<string, unknown>;
  seed_json: Record<string, unknown>;
  review_status: string;
}

interface GroupPlan {
  candidateId: string;
  title: string;
  atc7: string;
  form: string | null;
  masterTotalDeclared: number;
  reproducedMasters: number;
  eligible: boolean;
  reason: string;
  existingCanonical: number; // 그룹 내 canonical 보유 master (보존)
  alreadyApplied: number; // 이미 이 승격으로 canonical 붙은 master (idempotent no-op)
  newCanonicalInsert: number; // 신규 canonical INSERT 예정
}

function parseGroupKey(groupKey: string): { atc7: string; form: string | null } {
  // drug_otc::{single|combo}::oral::{atc7}::{token}::{form}
  const parts = groupKey.split('::');
  const atc7 = (parts[3] ?? '').toUpperCase();
  const form = parts[5] ?? null;
  return { atc7, form };
}

/** name-parsed doseForm 필터 SQL 조각 (dosage_form 컬럼은 NULL 다수 → name 기준) */
function formNameClause(form: string | null): string {
  switch (form) {
    case 'soft_capsule':
      return `m.name LIKE '%연질캡슐%'`;
    case 'capsule':
      return `m.name LIKE '%캡슐%' AND m.name NOT LIKE '%연질캡슐%'`;
    case 'tablet':
      return `m.name LIKE '%정%'`;
    case 'liquid':
      return `(m.name LIKE '%액%' OR m.name LIKE '%시럽%')`;
    case 'granule':
      return `(m.name LIKE '%과립%' OR m.name LIKE '%산%')`;
    default:
      return `TRUE`;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply =
    argv.includes('--apply') &&
    process.env.DRUG_OTC_NUTRITION_COMBO_CANONICAL_APPLY_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  if (!host) throw new Error('DB_HOST 미설정 — Cloud SQL Auth Proxy(127.0.0.1) 필요');
  const ds = new DataSource({
    type: 'postgres',
    host,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [],
    synchronize: false,
    logging: ['error'],
    ...(host && !host.startsWith('/cloudsql/') && !/^(127\.0\.0\.1|localhost)$/.test(host)
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  });
  await ds.initialize();

  const plans: GroupPlan[] = [];
  let insertedTotal = 0;

  try {
    // ── 0. 안전 사전검증 ──
    if (PASS_CANDIDATE_IDS.length !== 20) {
      throw new Error(`PASS 목록 20건이어야 함 (현재 ${PASS_CANDIDATE_IDS.length})`);
    }
    const overlap = PASS_CANDIDATE_IDS.filter((id) => EXCLUDED_CANDIDATE_IDS.includes(id));
    if (overlap.length > 0) throw new Error(`pass 목록에 excluded 포함: ${overlap.join(',')}`);

    // draft 재조회 (run + pass + needs_review, excluded 아님)
    const drafts: DraftRow[] = await ds.query(
      `SELECT candidate_id::text, title, content_html, content_json, seed_json, review_status
       FROM product_candidate_description_drafts
       WHERE seed_json->>'applyRunId'=$1
         AND source_label=$2
         AND deleted_at IS NULL
         AND candidate_id = ANY($3::uuid[])
         AND candidate_id <> ALL($4::uuid[])`,
      [RUN_ID, SOURCE_LABEL, PASS_CANDIDATE_IDS, EXCLUDED_CANDIDATE_IDS],
    );
    if (drafts.length !== 20) {
      throw new Error(`대상 draft 20건이어야 함 (조회 ${drafts.length}) — pass 목록/DB 불일치`);
    }
    const allNeedsReview = drafts.every((d) => d.review_status === 'needs_review');
    if (!allNeedsReview) throw new Error('review_status 전부 needs_review 여야 함(검수전 draft 층 유지)');

    // ── 1. 그룹별 enumeration + gate + insert 계획 ──
    for (const d of drafts) {
      const gs = (d.seed_json.groupScope ?? {}) as Record<string, unknown>;
      const groupKey = String(d.seed_json.groupKey ?? '');
      const { atc7, form } = parseGroupKey(groupKey);
      const masterTotalDeclared = Number(gs.masterTotal ?? -1);
      const formClause = formNameClause(form);

      // 재현: (atc7 + name-form) otc master 집합
      const [{ n: reproducedStr }]: { n: string }[] = await ds.query(
        `SELECT count(DISTINCT m.id) AS n
         FROM product_masters m JOIN product_drug_extensions e ON e.product_master_id=m.id
         WHERE m.drug_category='otc'
           AND upper(substr(e.atc_code,1,7))=$1 AND ${formClause}`,
        [atc7],
      );
      const reproduced = Number(reproducedStr);

      const eligible =
        masterTotalDeclared >= 0 && reproduced === masterTotalDeclared;
      const reason = eligible
        ? 'reproduced == declared masterTotal (verifiable set)'
        : `ENUM_MISMATCH: reproduced ${reproduced} != declared ${masterTotalDeclared} (그룹 축이 atc7+form 로 재현 불가 — 강도밴드/조성 세분. 멤버십 미저장)`;

      let existingCanonical = 0;
      let alreadyApplied = 0;
      let newCanonicalInsert = 0;

      if (eligible) {
        // 그룹 master 별 canonical 상태
        const [row]: { existing_canon: string; already_applied: string; target: string }[] =
          await ds.query(
            `WITH grp AS (
               SELECT DISTINCT m.id AS mid
               FROM product_masters m JOIN product_drug_extensions e ON e.product_master_id=m.id
               WHERE m.drug_category='otc'
                 AND upper(substr(e.atc_code,1,7))=$1 AND ${formClause}
             )
             SELECT
               (SELECT count(*) FROM grp) AS target,
               (SELECT count(*) FROM grp WHERE EXISTS(
                  SELECT 1 FROM shared_product_descriptions s
                  WHERE s.master_id=grp.mid AND s.deleted_at IS NULL AND s.status='canonical')) AS existing_canon,
               (SELECT count(*) FROM grp WHERE EXISTS(
                  SELECT 1 FROM shared_product_descriptions s
                  WHERE s.master_id=grp.mid AND s.deleted_at IS NULL
                    AND s.status='canonical' AND s.source_type=$2 AND s.source_ref_id=$3::uuid)) AS already_applied`,
            [atc7, PROMOTION_SOURCE_TYPE, d.candidate_id],
          );
        existingCanonical = Number(row.existing_canon);
        alreadyApplied = Number(row.already_applied);
        // 신규 INSERT = canonical 부재 master 수 (기존 canonical 은 보존/skip)
        newCanonicalInsert = reproduced - existingCanonical;

        if (apply && newCanonicalInsert > 0) {
          const content = d.content_html ?? String((d.content_json as any)?.bodyMarkdown ?? '');
          const summary = String((d.seed_json as any)?.summary ?? (d.content_json as any)?.summaryTable?.['사용목적'] ?? '') || null;
          const res = await ds.query(
            `INSERT INTO shared_product_descriptions
               (master_id, content, summary, source_type, source_ref_id, status, language, created_at, updated_at)
             SELECT m.id, $4, $5, $2, $3::uuid, 'canonical', $6, now(), now()
             FROM product_masters m JOIN product_drug_extensions e ON e.product_master_id=m.id
             WHERE m.drug_category='otc'
               AND upper(substr(e.atc_code,1,7))=$1 AND ${formClause}
               AND NOT EXISTS(
                 SELECT 1 FROM shared_product_descriptions s
                 WHERE s.master_id=m.id AND s.deleted_at IS NULL AND s.status='canonical')
             RETURNING id`,
            [atc7, PROMOTION_SOURCE_TYPE, d.candidate_id, content, summary, PROMOTION_LANGUAGE],
          );
          insertedTotal += Array.isArray(res) ? res.length : 0;
        }
      }

      plans.push({
        candidateId: d.candidate_id,
        title: d.title,
        atc7,
        form,
        masterTotalDeclared,
        reproducedMasters: reproduced,
        eligible,
        reason,
        existingCanonical,
        alreadyApplied,
        newCanonicalInsert,
      });
    }

    const eligiblePlans = plans.filter((p) => p.eligible);
    const mismatchPlans = plans.filter((p) => !p.eligible);
    const expectedInsert = eligiblePlans.reduce((n, p) => n + Math.max(0, p.newCanonicalInsert), 0);

    const report = {
      wo: 'WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-CANONICAL-PROMOTION-SCRIPT-V1',
      mode,
      runId: RUN_ID,
      passTargets: drafts.length,
      excludedEnforced: EXCLUDED_CANDIDATE_IDS.length,
      sourceType: PROMOTION_SOURCE_TYPE,
      eligibleGroups: eligiblePlans.length,
      mismatchGroups: mismatchPlans.length,
      expectedNewCanonicalInsert: expectedInsert,
      insertedTotal: apply ? insertedTotal : 0,
      dbWrite: apply ? insertedTotal : 0,
      plans,
    };

    console.log('───────────────────────────────────────────────');
    console.log(`OTC nutrition combo → canonical 승격 [${mode}]`);
    console.log('───────────────────────────────────────────────');
    console.log(`passTargets         : ${report.passTargets} / excludedEnforced ${report.excludedEnforced}`);
    console.log(`ELIGIBLE groups     : ${report.eligibleGroups}`);
    console.log(`ENUM_MISMATCH groups: ${report.mismatchGroups}`);
    console.log(`expectedNewInsert   : ${report.expectedNewCanonicalInsert}`);
    console.log(`dbWrite             : ${report.dbWrite}`);
    for (const p of plans) {
      const tag = p.eligible ? 'ELIGIBLE' : 'MISMATCH';
      console.log(
        `  [${tag}] ${p.atc7}/${p.form} declared=${p.masterTotalDeclared} reproduced=${p.reproducedMasters}` +
          (p.eligible ? ` existCanon=${p.existingCanonical} newInsert=${p.newCanonicalInsert}` : '') +
          `  «${p.title}»`,
      );
    }
    console.log('JSON_REPORT_BEGIN');
    console.log(JSON.stringify(report));
    console.log('JSON_REPORT_END');
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  console.error('[drug-otc-nutrition-combo-canonical-promotion] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
