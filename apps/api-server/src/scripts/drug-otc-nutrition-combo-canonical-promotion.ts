/**
 * 영양제류 복합제 pass → shared_product_descriptions(status='canonical') 승격 apply 스크립트
 *
 * WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-CANONICAL-PROMOTION-SCRIPT-V1
 *   → -MASTERIDS-DRYRUN-V1 (enumeration → 저장된 masterIds 기반 전환)
 * 선행: REVIEW-PREP(455892206) / MEMBERSHIP-PERSIST APPLY(f26683a91, 18그룹 masterIds 저장)
 *
 * 정책(사용자 확정):
 *   - REVIEW-PREP 검수 통과(pass)는 검수 완료 → 신규 SPD 는 status='canonical' 로 INSERT.
 *   - **승격 멤버십은 seed_json.groupScope.masterIds (MEMBERSHIP-PERSIST 저장분)를 SSOT 로 사용**
 *     (더 이상 atc7+form enumeration 재현/게이트 안 함).
 *   - canonical 부재 master 에만 신규 INSERT. 기존 canonical 보유 master 는 보존(UPDATE 금지).
 *   - master 당 canonical 1개(partial unique) 계약 준수. needs_review 중간 적재 없음.
 *   - masterIds 미보유 그룹(2 mismatch: 비타민C 1000mg·mgB 액제)은 승격 보류(NO_MASTERIDS).
 *   - excluded 3건(#1 a12cc 5mg / #12 a11db subgroup / #14 a11ex 제목충돌)은 완전 제외.
 *   - **SPD.content 는 HTML 계약** → draft bodyMarkdown 을 HTML 로 변환하여 저장(mdToHtml).
 *
 * DB write 게이트:
 *   - 실제 INSERT 는 `--apply` AND DRUG_OTC_NUTRITION_COMBO_CANONICAL_APPLY_CONFIRM=YES 둘 다 있을 때만.
 *   - 본 MASTERIDS-DRYRUN WO 는 dry-run 까지만 사용(DB write 0). 실제 write 는 후속 apply WO.
 *
 * 재실행 안전(idempotency):
 *   - INSERT 는 NOT EXISTS(canonical) 조건 → 재실행 시 이미 canonical 존재로 자동 no-op.
 *   - (source_type=PROMOTION_SOURCE_TYPE AND source_ref_id=candidate_id) canonical 은 already-applied 로 계측.
 *
 * Usage(dry-run):
 *   DB_HOST=127.0.0.1 DB_PORT=5433 DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
 *     npx tsx src/scripts/drug-otc-nutrition-combo-canonical-promotion.ts
 */

const RUN_ID = 'otc-nutrition-combo-draft-v1';
const SOURCE_LABEL = 'MFDS_DRUG_OTC';
/** 승격 SPD source_type (사용자 확정): e약은요 파생이나 O4O 가공 canonical 이라 감사·rollback·필터 위해 전용 값. entity union 등재됨. */
const PROMOTION_SOURCE_TYPE = 'mfds_drug_otc_nutrition_combo';
const PROMOTION_LANGUAGE = 'ko';

/** REVIEW-PREP CHECK 의 pass 20 candidate_id (SSOT: CHECK-...-REVIEW-CANONICAL-PREP-V1 §5) */
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
  groupKey: string;
  hasMasterIds: boolean;
  targetMasters: number;
  validOtcMasters: number; // masterIds 중 실제 OTC master 수 (방어)
  existingCanonical: number; // 보존
  alreadyApplied: number; // idempotent no-op
  newCanonicalInsert: number;
  contentHtmlLen: number;
  reason: string;
  // apply payload (write phase 전용)
  masterIds: string[];
  contentHtml: string;
  summary: string | null;
}

/** bodyMarkdown → HTML (이 draft 본문 구조 전용: ## 제목 / 파이프 표 / **볼드** / 문단). 외부 의존 없음. */
function mdToHtml(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join('<br>')}</p>`);
      para = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '') { flushPara(); continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (h) { flushPara(); const lvl = h[1].length; out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); continue; }
    if (trimmed.startsWith('|')) {
      flushPara();
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].trim()); i++; }
      i--; // 마지막 non-table 라인 되돌림
      const cells = (r: string) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const isSep = (r: string) => /^\|?[\s:|-]+\|?$/.test(r) && r.includes('-');
      const header = rows[0] && !isSep(rows[0]) ? cells(rows[0]) : null;
      const bodyRows = rows.filter((r, idx) => !(idx === 0 && header) && !isSep(r));
      const thead = header ? `<thead><tr>${header.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` : '';
      const tbody = `<tbody>${bodyRows.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }
    para.push(trimmed);
  }
  flushPara();
  return out.join('\n');
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
    type: 'postgres', host, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
    ...(host && !host.startsWith('/cloudsql/') && !/^(127\.0\.0\.1|localhost)$/.test(host)
      ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await ds.initialize();

  const plans: GroupPlan[] = [];
  let insertedTotal = 0;
  let sampleHtml = '';

  try {
    if (PASS_CANDIDATE_IDS.length !== 20) throw new Error(`PASS 20건 필요 (${PASS_CANDIDATE_IDS.length})`);
    if (PASS_CANDIDATE_IDS.some((id) => EXCLUDED_CANDIDATE_IDS.includes(id))) throw new Error('pass∩excluded');

    const drafts: DraftRow[] = await ds.query(
      `SELECT candidate_id::text, title, content_html, content_json, seed_json, review_status
       FROM product_candidate_description_drafts
       WHERE seed_json->>'applyRunId'=$1 AND source_label=$2 AND deleted_at IS NULL
         AND candidate_id = ANY($3::uuid[]) AND candidate_id <> ALL($4::uuid[])`,
      [RUN_ID, SOURCE_LABEL, PASS_CANDIDATE_IDS, EXCLUDED_CANDIDATE_IDS],
    );
    if (drafts.length !== 20) throw new Error(`대상 draft 20건 필요 (조회 ${drafts.length})`);
    if (!drafts.every((d) => d.review_status === 'needs_review')) throw new Error('needs_review 아님');

    for (const d of drafts) {
      const gs = (d.seed_json.groupScope ?? {}) as Record<string, unknown>;
      const groupKey = String(d.seed_json.groupKey ?? '');
      const masterIds = Array.isArray(gs.masterIds) ? (gs.masterIds as string[]) : null;

      if (!masterIds) {
        plans.push({
          candidateId: d.candidate_id, title: d.title, groupKey, hasMasterIds: false,
          targetMasters: 0, validOtcMasters: 0, existingCanonical: 0, alreadyApplied: 0,
          newCanonicalInsert: 0, contentHtmlLen: 0,
          reason: 'NO_MASTERIDS: MEMBERSHIP-PERSIST 미저장 그룹(mismatch) — 승격 보류',
          masterIds: [], contentHtml: '', summary: null,
        });
        continue;
      }

      // masterIds 기반 canonical 현황 + OTC 방어검증
      const [row]: { valid_otc: string; existing_canon: string; already_applied: string }[] = await ds.query(
        `SELECT
           (SELECT count(*) FROM product_masters m WHERE m.id = ANY($1::uuid[]) AND m.drug_category='otc') AS valid_otc,
           (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(
              SELECT 1 FROM shared_product_descriptions s
              WHERE s.master_id=mid AND s.deleted_at IS NULL AND s.status='canonical')) AS existing_canon,
           (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(
              SELECT 1 FROM shared_product_descriptions s
              WHERE s.master_id=mid AND s.deleted_at IS NULL AND s.status='canonical'
                AND s.source_type=$2 AND s.source_ref_id=$3::uuid)) AS already_applied`,
        [masterIds, PROMOTION_SOURCE_TYPE, d.candidate_id],
      );
      const validOtc = Number(row.valid_otc);
      const existingCanonical = Number(row.existing_canon);
      const alreadyApplied = Number(row.already_applied);
      const newInsert = masterIds.length - existingCanonical;

      const contentHtml = mdToHtml(String((d.content_json as any)?.bodyMarkdown ?? d.content_html ?? ''));
      if (!sampleHtml) sampleHtml = contentHtml;
      const summary = String((d.content_json as any)?.summaryTable?.['사용목적'] ?? '') || null;

      const otcWarn = validOtc !== masterIds.length ? ` ⚠️validOtc ${validOtc}/${masterIds.length}` : '';
      plans.push({
        candidateId: d.candidate_id, title: d.title, groupKey, hasMasterIds: true,
        targetMasters: masterIds.length, validOtcMasters: validOtc,
        existingCanonical, alreadyApplied, newCanonicalInsert: newInsert,
        contentHtmlLen: contentHtml.length,
        reason: `masterIds 기반 승격 대상${otcWarn}`,
        masterIds, contentHtml, summary,
      });
    }

    // ── apply: 단일 트랜잭션으로 eligible 그룹 canonical INSERT + post-count ──
    const eligibleForWrite = plans.filter((p) => p.hasMasterIds);
    if (eligibleForWrite.some((p) => p.validOtcMasters !== p.targetMasters)) {
      throw new Error('otc 방어검증 실패 — masterIds 에 비-OTC master 포함, apply 중단');
    }
    let postInsertedByGroup: { candidateId: string; inserted: number }[] = [];
    if (apply) {
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        for (const p of eligibleForWrite) {
          const res = await qr.query(
            `INSERT INTO shared_product_descriptions
               (master_id, content, summary, source_type, source_ref_id, status, language, created_at, updated_at)
             SELECT mid, $4, $5, $2, $3::uuid, 'canonical', $6, now(), now()
             FROM unnest($1::uuid[]) mid
             WHERE NOT EXISTS(
               SELECT 1 FROM shared_product_descriptions s
               WHERE s.master_id=mid AND s.deleted_at IS NULL AND s.status='canonical')
             RETURNING id`,
            [p.masterIds, PROMOTION_SOURCE_TYPE, p.candidateId, p.contentHtml, p.summary, PROMOTION_LANGUAGE],
          );
          const n = Array.isArray(res) ? res.length : 0;
          insertedTotal += n;
          postInsertedByGroup.push({ candidateId: p.candidateId, inserted: n });
        }
        // post-count 검증: 실제 insert 합 == 예상 newInsert 합, master 당 canonical 중복 0
        const expected = eligibleForWrite.reduce((n, p) => n + Math.max(0, p.newCanonicalInsert), 0);
        const [{ dup }]: { dup: string }[] = await qr.query(
          `SELECT count(*) AS dup FROM (
             SELECT master_id FROM shared_product_descriptions
             WHERE status='canonical' AND deleted_at IS NULL
             GROUP BY master_id HAVING count(*) > 1) t`,
        );
        if (insertedTotal !== expected) {
          await qr.rollbackTransaction();
          throw new Error(`post-count 불일치 → rollback. inserted=${insertedTotal} expected=${expected}`);
        }
        if (Number(dup) > 0) {
          await qr.rollbackTransaction();
          throw new Error(`master 당 canonical 중복 ${dup} 감지 → rollback`);
        }
        await qr.commitTransaction();
      } catch (e) {
        if (qr.isTransactionActive) await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
    }

    const eligible = plans.filter((p) => p.hasMasterIds);
    const blocked = plans.filter((p) => !p.hasMasterIds);
    const expectedInsert = eligible.reduce((n, p) => n + Math.max(0, p.newCanonicalInsert), 0);
    const preservedCanonical = eligible.reduce((n, p) => n + p.existingCanonical, 0);
    const otcMismatch = eligible.filter((p) => p.validOtcMasters !== p.targetMasters);

    const report = {
      wo: 'WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-CANONICAL-PROMOTION-MASTERIDS-DRYRUN-V1',
      mode, runId: RUN_ID, membershipSource: 'seed_json.groupScope.masterIds',
      passTargets: drafts.length, excludedEnforced: EXCLUDED_CANDIDATE_IDS.length,
      eligibleGroups: eligible.length, blockedGroups: blocked.length,
      expectedNewCanonicalInsert: expectedInsert, preservedExistingCanonical: preservedCanonical,
      otcDefenseMismatchGroups: otcMismatch.length,
      insertedTotal: apply ? insertedTotal : 0, dbWrite: apply ? insertedTotal : 0,
      postInsertedByGroup: apply ? postInsertedByGroup : [],
      contentFormat: 'html (bodyMarkdown→mdToHtml)',
      sourceType: PROMOTION_SOURCE_TYPE,
      // 무거운 필드(masterIds 배열·contentHtml) 제외한 lean plan
      plans: plans.map((p) => ({
        candidateId: p.candidateId, title: p.title, groupKey: p.groupKey, hasMasterIds: p.hasMasterIds,
        targetMasters: p.targetMasters, validOtcMasters: p.validOtcMasters,
        existingCanonical: p.existingCanonical, alreadyApplied: p.alreadyApplied,
        newCanonicalInsert: p.newCanonicalInsert, contentHtmlLen: p.contentHtmlLen, reason: p.reason,
      })),
    };

    console.log('───────────────────────────────────────────────');
    console.log(`OTC nutrition combo → canonical 승격 (masterIds 기반) [${mode}]`);
    console.log('───────────────────────────────────────────────');
    console.log(`membership          : seed_json.groupScope.masterIds`);
    console.log(`passTargets ${report.passTargets} / excludedEnforced ${report.excludedEnforced}`);
    console.log(`ELIGIBLE(masterIds) ${report.eligibleGroups} / BLOCKED(no-masterIds) ${report.blockedGroups}`);
    console.log(`expectedNewInsert   : ${report.expectedNewCanonicalInsert}`);
    console.log(`preservedCanonical  : ${report.preservedExistingCanonical}`);
    console.log(`otcDefenseMismatch  : ${report.otcDefenseMismatchGroups}`);
    console.log(`content format      : html (bodyMarkdown→mdToHtml)`);
    console.log(`dbWrite             : ${report.dbWrite}`);
    for (const p of plans) {
      const tag = p.hasMasterIds ? 'ELIGIBLE' : 'BLOCKED ';
      console.log(
        `  [${tag}] target=${p.targetMasters} existCanon=${p.existingCanonical} newInsert=${p.newCanonicalInsert}` +
          ` htmlLen=${p.contentHtmlLen}  «${p.title}»`,
      );
    }
    console.log('── content HTML sample (first 500 chars) ──');
    console.log(sampleHtml.slice(0, 500));
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
