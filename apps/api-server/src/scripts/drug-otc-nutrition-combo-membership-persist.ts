/**
 * 영양제류 복합제 pass 20 — draft별 실제 target master 멤버십을 seed_json 에 persist (dry-run/apply)
 *
 * WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-MEMBERSHIP-PERSIST-V1
 * 선행: STRENGTH-SPLIT CHECK(분류 SSOT) / CANONICAL-PROMOTION-SCRIPT dry-run(16 ENUM_MISMATCH)
 *
 * 배경:
 *   promotion 스크립트가 (atc7+form) 만으로 재현해 16그룹이 ENUM_MISMATCH 였다.
 *   실제 그룹 축은 STRENGTH-SPLIT-V1 §1.3 이 정의한 (a) 복합제=조성(비타민A/철), (b) 단일제=함량.
 *   본 스크립트는 그 분류를 재현해 그룹별 master_id 집합을 산출하고,
 *   seed_json.groupScope.masterIds 에 저장(apply)한다. 이후 promotion 은 enumeration 대신 이 배열을 사용.
 *
 * 분류 재현(운영 DB 실측 검증 완료):
 *   - 복합제 조성: e약은요 canonical content 정규식
 *       A+  = content ~ '비타민 ?A를 1일 ?5,?000'   (임신 5,000IU 경고)
 *       Fe+ = content ~ '(철 ?결핍성 ?빈혈|철분 ?중독)'
 *       comp∈{A-Fe,A-noFe,noA-Fe,noA-noFe}. named 토큰(caD/DEC/B1B2B6C/mgB)=noA-noFe(동질 A-/Fe-).
 *       baseline noA-noFe = (atc×form) − (양성 태그) → ungrounded master 포함.
 *   - 단일제 함량: product_masters.specification 첫 토큰 버킷(아래 STRENGTH_BUCKET).
 *
 * 검증 타깃(중요):
 *   draft.groupScope.masterTotal 은 대부분 분류 재현치와 일치하나, 일부(stale)일 수 있으므로
 *   본 스크립트는 재현 masterIds 수를 groupScope.masterTotal 과 비교해 MATCH 인 그룹만
 *   persist 대상으로 삼는다. 불일치 그룹은 write 하지 않고 blocker 로 보고한다.
 *
 * DB write 게이트: `--apply` AND DRUG_OTC_NUTRITION_COMBO_MEMBERSHIP_PERSIST_CONFIRM=YES.
 *   write 범위 = product_candidate_description_drafts.seed_json (groupScope.masterIds 추가) + updated_at. 그 외 금지.
 *
 * Usage(dry-run):
 *   DB_HOST=127.0.0.1 DB_PORT=5433 DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
 *     npx tsx src/scripts/drug-otc-nutrition-combo-membership-persist.ts
 */

const RUN_ID = 'otc-nutrition-combo-draft-v1';
const SOURCE_LABEL = 'MFDS_DRUG_OTC';

const PASS_CANDIDATE_IDS: string[] = [
  '79a515f0-fb13-4b58-a01b-3f1b524c29f0', 'fcf616ee-339e-489f-9672-a431489fb1ac',
  '270a10a2-70a3-4a04-a370-9b5316c4a0b4', '1121423d-e606-4671-ac08-c4baf7464439',
  '5a342fe9-1cdf-49c1-863d-84654d433720', 'db7c085e-d233-499c-bb99-56f2e9efcd58',
  '41fc4904-171e-43c2-b923-1a120c1c12de', '738fce8e-2eeb-4a9c-901f-88e0b783209d',
  '91d2a67d-669c-418d-840a-e065e311acc1', '8b8ad3b4-eb43-4d52-b284-eac2a7de194e',
  '26c2af33-f6ba-4a09-a686-da8c98137aff', '6f143bbc-ff49-4ffc-9271-42e50cf2e84d',
  '2bb82579-3b25-402f-81b8-1a6c6280bc2c', 'b21c54a6-e248-477f-bc23-f5f1a6701587',
  'b96f3977-94ff-4deb-bc0a-10f2945cc92c', '6343c0f5-cfe9-434b-925a-d42ae1cc86d8',
  'cda011db-9d62-4b58-aa56-d5a03bcafa83', '03751234-7793-4635-8043-26257b32a3fd',
  '029b8650-257b-47bb-ae3e-a42444c39d93', 'd29b1340-498e-4128-b6e1-b667e0135035',
];
const EXCLUDED_CANDIDATE_IDS: string[] = [
  'a3c46e34-bb63-41a9-a38b-d96a613c6a12', '1eb608e0-9a4a-4489-8866-b9512fa913b9',
  'd5265213-034c-4999-929b-c8780c3e0830',
];

/** 단일제 함량 버킷 — key=`${atc7}::${token}` → spec 첫 토큰 predicate. 'WHOLE'=atc×form 전량(단일 함량). */
const STRENGTH_BUCKET: Record<string, string> = {
  'A11HA05::5mg': 'WHOLE', // 비오틴: 전량 5mg 단일
  'A11GA01::1000mg': `split_part(m.specification,' / ',1) IN ('1000밀리그램','1030밀리그램','1030.9밀리그램','1031밀리그램')`, // 1000mg급
  'A11HA03::100iu': `split_part(m.specification,' / ',1) = '100밀리그램'`,
  'A11HA03::400iu': `split_part(m.specification,' / ',1) = '400IU'`,
  'A11HA03::1000iu': `split_part(m.specification,' / ',1) IN ('1000IU','1000밀리그램')`,
  'A12CC::290mg': `split_part(m.specification,' / ',1) = '290.8밀리그램'`,
  'A12CC::470mg': `split_part(m.specification,' / ',1) = '470밀리그램'`,
  'A12CC::940mg': `split_part(m.specification,' / ',1) = '940밀리그램'`,
};

const COMPOSITION_TOKENS = new Set(['A-Fe', 'A-noFe', 'noA-Fe', 'noA-noFe']);

function formNameClause(form: string | null): string {
  switch (form) {
    case 'soft_capsule': return `m.name LIKE '%연질캡슐%'`;
    case 'capsule': return `m.name LIKE '%캡슐%' AND m.name NOT LIKE '%연질캡슐%'`;
    case 'tablet': return `m.name LIKE '%정%'`;
    case 'liquid': return `(m.name LIKE '%액%' OR m.name LIKE '%시럽%')`;
    case 'granule': return `(m.name LIKE '%과립%' OR m.name LIKE '%산%')`;
    default: return `TRUE`;
  }
}

const A_POS = `EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=m.id AND s.deleted_at IS NULL AND s.source_type='mfds_easy_drug' AND s.content ~ '비타민 ?A를 1일 ?5,?000')`;
const FE_POS = `EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=m.id AND s.deleted_at IS NULL AND s.source_type='mfds_easy_drug' AND s.content ~ '(철 ?결핍성 ?빈혈|철분 ?중독)')`;

function compositionClause(comp: string): string {
  switch (comp) {
    case 'A-Fe': return `${A_POS} AND ${FE_POS}`;
    case 'A-noFe': return `${A_POS} AND NOT ${FE_POS}`;
    case 'noA-Fe': return `NOT ${A_POS} AND ${FE_POS}`;
    case 'noA-noFe': return `NOT ${A_POS} AND NOT ${FE_POS}`;
    default: return `NOT ${A_POS} AND NOT ${FE_POS}`; // named 동질 combo = noA-noFe
  }
}

interface DraftRow {
  candidate_id: string; title: string;
  seed_json: Record<string, unknown>; review_status: string;
}
interface MemberPlan {
  candidateId: string; title: string; atc7: string; form: string | null;
  token: string; kind: 'composition' | 'strength' | 'combo-homogeneous';
  masterTotalDeclared: number; reproduced: number; match: boolean; reason: string;
  masterIds: string[];
}

function classify(groupKey: string, singleOrCombo: string): {
  atc7: string; form: string | null; token: string;
  kind: MemberPlan['kind']; predicate: string;
} {
  const parts = groupKey.split('::');
  const atc7 = (parts[3] ?? '').toUpperCase();
  const token = parts[4] ?? '';
  const form = parts[5] ?? null;
  const formClause = formNameClause(form);
  if (singleOrCombo === 'single') {
    const bucket = STRENGTH_BUCKET[`${atc7}::${token}`];
    const strengthPred = !bucket ? 'FALSE /* unknown strength bucket */' : bucket === 'WHOLE' ? 'TRUE' : bucket;
    return { atc7, form, token, kind: 'strength', predicate: `${formClause} AND (${strengthPred})` };
  }
  // combo
  const kind: MemberPlan['kind'] = COMPOSITION_TOKENS.has(token) ? 'composition' : 'combo-homogeneous';
  return { atc7, form, token, kind, predicate: `${formClause} AND (${compositionClause(token)})` };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply =
    argv.includes('--apply') &&
    process.env.DRUG_OTC_NUTRITION_COMBO_MEMBERSHIP_PERSIST_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  if (!host) throw new Error('DB_HOST 미설정');
  const ds = new DataSource({
    type: 'postgres', host, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
    ...(host && !host.startsWith('/cloudsql/') && !/^(127\.0\.0\.1|localhost)$/.test(host)
      ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await ds.initialize();
  const plans: MemberPlan[] = [];
  let persistedGroups = 0;

  try {
    if (PASS_CANDIDATE_IDS.length !== 20) throw new Error(`PASS 20건 필요 (${PASS_CANDIDATE_IDS.length})`);
    if (PASS_CANDIDATE_IDS.some((id) => EXCLUDED_CANDIDATE_IDS.includes(id))) throw new Error('pass∩excluded');

    const drafts: DraftRow[] = await ds.query(
      `SELECT candidate_id::text, title, seed_json, review_status
       FROM product_candidate_description_drafts
       WHERE seed_json->>'applyRunId'=$1 AND source_label=$2 AND deleted_at IS NULL
         AND candidate_id = ANY($3::uuid[]) AND candidate_id <> ALL($4::uuid[])`,
      [RUN_ID, SOURCE_LABEL, PASS_CANDIDATE_IDS, EXCLUDED_CANDIDATE_IDS],
    );
    if (drafts.length !== 20) throw new Error(`대상 20건 필요 (조회 ${drafts.length})`);
    if (!drafts.every((d) => d.review_status === 'needs_review')) throw new Error('needs_review 아님');

    for (const d of drafts) {
      const gs = (d.seed_json.groupScope ?? {}) as Record<string, unknown>;
      const groupKey = String(d.seed_json.groupKey ?? '');
      const singleOrCombo = String(d.seed_json.singleOrCombo ?? (groupKey.includes('::combo::') ? 'combo' : 'single'));
      const masterTotalDeclared = Number(gs.masterTotal ?? -1);
      const { atc7, form, token, kind, predicate } = classify(groupKey, singleOrCombo);

      const [row]: { ids: string[] | null }[] = await ds.query(
        `SELECT array_agg(DISTINCT m.id) AS ids
         FROM product_masters m JOIN product_drug_extensions e ON e.product_master_id=m.id
         WHERE m.drug_category='otc' AND upper(substr(e.atc_code,1,7))=$1 AND (${predicate})`,
        [atc7],
      );
      const ids = row.ids ?? [];
      const reproduced = ids.length;
      const match = masterTotalDeclared >= 0 && reproduced === masterTotalDeclared;
      const reason = match
        ? 'reproduced == declared masterTotal → persist-ready'
        : `MISMATCH: reproduced ${reproduced} != declared ${masterTotalDeclared} (groupScope.masterTotal stale 또는 축 재확인 필요)`;

      plans.push({
        candidateId: d.candidate_id, title: d.title, atc7, form, token, kind,
        masterTotalDeclared, reproduced, match, reason, masterIds: ids,
      });
    }

    const matched = plans.filter((p) => p.match);
    const mismatched = plans.filter((p) => !p.match);

    // ── apply: 단일 트랜잭션으로 matched 그룹만 masterIds 저장 + 사후검증 ──
    const postVerify: { candidateId: string; storedLen: number; masterTotal: number; ok: boolean }[] = [];
    if (apply) {
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        for (const p of matched) {
          await qr.query(
            `UPDATE product_candidate_description_drafts
             SET seed_json = jsonb_set(seed_json, '{groupScope,masterIds}', $2::jsonb, true), updated_at=now()
             WHERE candidate_id=$1::uuid AND seed_json->>'applyRunId'=$3`,
            [p.candidateId, JSON.stringify(p.masterIds), RUN_ID],
          );
          persistedGroups += 1;
        }
        // 트랜잭션 내 사후검증: 저장된 masterIds 길이 == groupScope.masterTotal
        for (const p of matched) {
          const [r]: { stored_len: string; master_total: string }[] = await qr.query(
            `SELECT jsonb_array_length(seed_json->'groupScope'->'masterIds') AS stored_len,
                    (seed_json->'groupScope'->>'masterTotal') AS master_total
             FROM product_candidate_description_drafts WHERE candidate_id=$1::uuid`,
            [p.candidateId],
          );
          const storedLen = Number(r.stored_len);
          const masterTotal = Number(r.master_total);
          postVerify.push({ candidateId: p.candidateId, storedLen, masterTotal, ok: storedLen === masterTotal });
        }
        const allOk = postVerify.every((v) => v.ok) && persistedGroups === matched.length;
        if (!allOk) {
          await qr.rollbackTransaction();
          throw new Error(`post-check 실패 → rollback. persisted=${persistedGroups}/${matched.length}, mismatch=${postVerify.filter((v) => !v.ok).length}`);
        }
        await qr.commitTransaction();
      } catch (e) {
        if (qr.isTransactionActive) await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
    }
    const report = {
      wo: 'WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-MEMBERSHIP-PERSIST-V1',
      mode, runId: RUN_ID, passTargets: drafts.length, excludedEnforced: EXCLUDED_CANDIDATE_IDS.length,
      persistReadyGroups: matched.length, mismatchGroups: mismatched.length,
      persistedGroups: apply ? persistedGroups : 0,
      dbWrite: apply ? persistedGroups : 0,
      postVerifyAllOk: apply ? postVerify.every((v) => v.ok) : null,
      postVerify: apply ? postVerify : [],
      plans,
    };

    console.log('───────────────────────────────────────────────');
    console.log(`OTC nutrition combo — membership persist [${mode}]`);
    console.log('───────────────────────────────────────────────');
    console.log(`passTargets ${report.passTargets} / excludedEnforced ${report.excludedEnforced}`);
    console.log(`persist-ready ${report.persistReadyGroups} / MISMATCH ${report.mismatchGroups} / dbWrite ${report.dbWrite}`);
    if (apply) console.log(`postVerify allOk=${report.postVerifyAllOk} (persisted ${report.persistedGroups}/${matched.length})`);
    for (const p of plans) {
      console.log(
        `  [${p.match ? 'MATCH   ' : 'MISMATCH'}] ${p.kind.padEnd(18)} ${p.atc7}/${p.form}/${p.token} declared=${p.masterTotalDeclared} reproduced=${p.reproduced}  «${p.title}»`,
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
  console.error('[drug-otc-nutrition-combo-membership-persist] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});

// top-level import/export 가 없으면 TS 가 이 파일을 global script 로 취급해
// 다른 스크립트의 `main` 선언과 충돌한다(TS2393). 모듈로 고정한다.
export {};
