/**
 * Medical Device Gate B Promotion CLI
 * — 의료기기 ProductCandidate → ProductMaster/ProductIdentifier 승격 계획 dry-run
 *
 * WO-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-SCRIPT-V1
 * runbook: docs/checks/WO-O4O-MEDICAL-DEVICE-GATE-B-APPLY-RUNBOOK-V1.md
 *
 * Usage:
 *   npx tsx apps/api-server/src/scripts/medical-device-gate-b-promotion.ts \
 *     --dry-run --use-db --permit-status-map <path.tsv> [--limit N]
 *
 * 안전 경계 (이 WO):
 *   - dry-run 전용. --apply 는 env gate 없이 APPLY_BLOCKED, gate 있어도 이 WO 에서는 미구현(APPLY_NOT_IMPLEMENTED).
 *   - dry-run 은 read-only SELECT 만 (product_candidates 조회 + barcode/normalized 충돌 대조). write 0.
 *   - status map 은 파일 입력(--permit-status-map). 없으면 fail-fast (API 재호출 안 함).
 */

import '../env-loader.js';
import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';
import {
  buildPromotionPlan,
  groupIntoMasters,
  parsePermitStatusMapTsv,
  executePromotion,
  MDS_SOURCE_LABEL,
  MDS_SOURCE_KIND,
  type GateBCandidate,
  type MasterPreview,
  type MasterRow,
  type IdentifierRow,
  type CandidateUpdate,
  type PromotionSink,
} from '../modules/neture/drug-import/medical-device-gate-b-promotion.service.js';

/** 프로덕션 Sink — QueryRunner(트랜잭션) 기반 배치 write. */
class QueryRunnerSink implements PromotionSink {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private qr: any) {}

  async insertMasters(rows: MasterRow[]): Promise<Array<{ barcode: string; id: string }>> {
    const values: string[] = [];
    const params: unknown[] = [];
    let p = 0;
    for (const r of rows) {
      values.push(
        `(gen_random_uuid(), $${++p}, $${++p}, $${++p}, $${++p}, $${++p}, $${++p}, $${++p}, $${++p}, true, '[]'::jsonb, NOW(), NOW())`,
      );
      params.push(
        r.barcode,
        r.regulatoryType,
        r.regulatoryName,
        r.name,
        r.manufacturerName,
        r.mfdsProductId,
        r.mfdsPermitNumber,
        r.specification,
      );
    }
    const res: Array<{ id: string; barcode: string }> = await this.qr.query(
      `INSERT INTO product_masters
         (id, barcode, regulatory_type, regulatory_name, name, manufacturer_name,
          mfds_product_id, mfds_permit_number, specification, is_mfds_verified, tags, created_at, updated_at)
       VALUES ${values.join(',')}
       RETURNING id, barcode`,
      params,
    );
    return res.map((r) => ({ id: String(r.id), barcode: String(r.barcode) }));
  }

  async insertIdentifiers(rows: IdentifierRow[]): Promise<void> {
    if (!rows.length) return;
    const values: string[] = [];
    const params: unknown[] = [];
    let p = 0;
    for (const r of rows) {
      values.push(
        `(gen_random_uuid(), $${++p}, $${++p}, $${++p}, $${++p}, $${++p}, $${++p}, $${++p}, $${++p}, $${++p}, $${++p}::jsonb, NOW(), NOW())`,
      );
      params.push(
        r.productMasterId,
        r.identifierType,
        r.identifierValue,
        r.normalizedValue,
        r.isPrimary,
        r.verificationStatus,
        r.sourceType,
        r.sourceId,
        r.sourceLabel,
        JSON.stringify(r.metadata),
      );
    }
    await this.qr.query(
      `INSERT INTO product_identifiers
         (id, product_master_id, identifier_type, identifier_value, normalized_value,
          is_primary, verification_status, source_type, source_id, source_label,
          metadata, created_at, updated_at)
       VALUES ${values.join(',')}`,
      params,
    );
  }

  async updateCandidates(updates: CandidateUpdate[]): Promise<void> {
    if (!updates.length) return;
    const values: string[] = [];
    const params: unknown[] = [];
    let p = 0;
    for (const u of updates) {
      const status = u.role === 'representative' ? 'approved_new_master' : 'merged';
      values.push(`($${++p}, $${++p}, $${++p})`);
      params.push(u.candidateId, u.masterId, status);
    }
    await this.qr.query(
      `UPDATE product_candidates c
          SET candidate_status = v.status,
              matched_product_master_id = v.master_id::uuid,
              updated_at = NOW()
         FROM (VALUES ${values.join(',')}) AS v(cand_id, master_id, status)
        WHERE c.id = v.cand_id::uuid`,
      params,
    );
  }
}

interface CliArgs {
  apply: boolean;
  useDb: boolean;
  permitStatusMap: string | null;
  limit: number | null;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    return eq ? eq.split('=').slice(1).join('=') : undefined;
  };
  const has = (name: string): boolean => argv.includes(`--${name}`);
  const apply = has('apply');
  const dryRun = has('dry-run');
  if (apply && dryRun) throw new Error('--apply 와 --dry-run 동시 지정 불가');
  const limitRaw = get('limit');
  return {
    apply,
    useDb: has('use-db'),
    permitStatusMap: get('permit-status-map') ?? null,
    limit: limitRaw != null ? parseInt(limitRaw, 10) : null,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // 🚨 apply 가드: env gate + use-db + permit-status-map 모두 필요. 하나라도 없으면 fail-fast.
  if (args.apply) {
    if (process.env.MEDICAL_DEVICE_GATE_B_ALLOW_APPLY !== 'I_UNDERSTAND') {
      throw new Error(
        'APPLY_BLOCKED: --apply 는 안전 경계에 의해 차단됨. (해제: MEDICAL_DEVICE_GATE_B_ALLOW_APPLY=I_UNDERSTAND)',
      );
    }
    if (!args.useDb) throw new Error('APPLY_BLOCKED: --apply 는 --use-db 필수');
    if (!args.permitStatusMap) throw new Error('APPLY_BLOCKED: --apply 는 --permit-status-map 필수');
  }

  // status map (fail-fast)
  if (!args.permitStatusMap) throw new Error('--permit-status-map <path> 필수 (허가 상태 맵 TSV)');
  const mapAbs = path.isAbsolute(args.permitStatusMap)
    ? args.permitStatusMap
    : path.resolve(process.cwd(), args.permitStatusMap);
  if (!fs.existsSync(mapAbs)) throw new Error(`status map 파일 없음: ${mapAbs}`);
  const statusMap = parsePermitStatusMapTsv(fs.readFileSync(mapAbs, 'utf-8'));

  if (!args.useDb) throw new Error('--use-db 필수 (Gate A applied 후보 조회 필요)');

  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  const isLocalProxy = host === '127.0.0.1' || host === 'localhost';
  const useSsl = !!host && !host.startsWith('/cloudsql/') && !isLocalProxy;
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
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await ds.initialize();

  try {
    // 1) Gate A applied 후보 조회
    const limitSql = args.limit != null ? `LIMIT ${args.limit}` : '';
    const rows: Array<Record<string, unknown>> = await ds.query(
      `SELECT id, identifier_type, identifier_value, match_status,
              candidate_name, candidate_manufacturer, candidate_spec,
              raw_payload->>'permitNo'                 AS permit_no,
              raw_payload->'source'->>'PRDLST_NM'      AS prdlst_nm,
              raw_payload->>'sourceRowSignature'       AS row_signature
         FROM product_candidates
        WHERE source_type = 'external_api'
          AND source_label = $1
          AND raw_payload->>'sourceKind' = $2
          AND deleted_at IS NULL
        ${limitSql}`,
      [MDS_SOURCE_LABEL, MDS_SOURCE_KIND],
    );

    const candidates: GateBCandidate[] = rows.map((r) => ({
      id: String(r.id),
      identifierType: (r.identifier_type as string | null) ?? null,
      identifierValue: (r.identifier_value as string | null) ?? null,
      matchStatus: String(r.match_status ?? 'unmatched'),
      candidateName: (r.candidate_name as string | null) ?? null,
      candidateManufacturer: (r.candidate_manufacturer as string | null) ?? null,
      candidateSpec: (r.candidate_spec as string | null) ?? null,
      permitNo: (r.permit_no as string | null) ?? null,
      prdlstNm: (r.prdlst_nm as string | null) ?? null,
      rowSignature: String(r.row_signature ?? ''),
    }));

    // 2) 계획(DB 충돌 제외)
    const { promotable, holds } = buildPromotionPlan(candidates, statusMap);
    let masters = groupIntoMasters(promotable);

    // 3) DB 충돌 대조 (promotable barcode 대상 targeted)
    const barcodes = masters.map((m) => m.barcode);
    let dbBarcodeConflict = 0;
    let dbIdentifierConflict = 0;
    if (barcodes.length) {
      const bcRows: Array<{ barcode: string }> = await ds.query(
        `SELECT barcode FROM product_masters WHERE barcode = ANY($1)`,
        [barcodes],
      );
      const normRows: Array<{ normalized_value: string }> = await ds.query(
        `SELECT normalized_value FROM product_identifiers
          WHERE normalized_value = ANY($1) AND deleted_at IS NULL`,
        [barcodes],
      );
      const conflictBc = new Set(bcRows.map((r) => r.barcode));
      const conflictNorm = new Set(normRows.map((r) => r.normalized_value));
      dbBarcodeConflict = conflictBc.size;
      dbIdentifierConflict = conflictNorm.size;
      masters = masters.filter((m) => !conflictBc.has(m.barcode) && !conflictNorm.has(m.barcode));
    }

    const wouldCreateIdentifiers = masters.reduce((n, m) => n + m.identifiers.length, 0);

    if (args.apply) {
      // ── APPLY: 단일 트랜잭션 배치 승격 (ProductMaster + ProductIdentifier + candidate status) ──
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      let applied: { masters: number; identifiers: number; candidateUpdates: number };
      try {
        applied = await executePromotion(new QueryRunnerSink(qr), masters);
        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
      const areport = {
        mode: 'apply',
        sourceLabel: MDS_SOURCE_LABEL,
        statusMapEntries: statusMap.size,
        candidateInput: candidates.length,
        promotableRows: promotable.length,
        createdMasters: applied.masters,
        createdIdentifiers: applied.identifiers,
        candidateUpdates: applied.candidateUpdates,
        dbBarcodeConflicts: dbBarcodeConflict,
        dbIdentifierConflicts: dbIdentifierConflict,
        holdBreakdown: holds,
      };
      console.log('의료기기 Gate B promotion APPLY 결과');
      console.log(`createdMasters       : ${areport.createdMasters}`);
      console.log(`createdIdentifiers   : ${areport.createdIdentifiers}`);
      console.log(`candidateUpdates     : ${areport.candidateUpdates}`);
      console.log('JSON_REPORT_BEGIN');
      console.log(JSON.stringify(areport));
      console.log('JSON_REPORT_END');
      return;
    }

    const report = {
      mode: 'dry-run',
      sourceLabel: MDS_SOURCE_LABEL,
      statusMapEntries: statusMap.size,
      candidateInput: candidates.length,
      promotableRows: promotable.length,
      wouldCreateMasters: masters.length,
      wouldCreateIdentifiers,
      dbBarcodeConflicts: dbBarcodeConflict,
      dbIdentifierConflicts: dbIdentifierConflict,
      holdBreakdown: holds,
      write: 0,
    };

    console.log('───────────────────────────────────────────────');
    console.log('의료기기 Gate B promotion dry-run 결과');
    console.log('───────────────────────────────────────────────');
    console.log(`statusMapEntries      : ${report.statusMapEntries}`);
    console.log(`candidateInput        : ${report.candidateInput}`);
    console.log(`promotableRows(pre-db): ${report.promotableRows}`);
    console.log(`dbBarcodeConflicts    : ${report.dbBarcodeConflicts}`);
    console.log(`dbIdentifierConflicts : ${report.dbIdentifierConflicts}`);
    console.log(`wouldCreateMasters    : ${report.wouldCreateMasters}`);
    console.log(`wouldCreateIdentifiers: ${report.wouldCreateIdentifiers}`);
    console.log(`holdBreakdown         : ${JSON.stringify(report.holdBreakdown)}`);
    console.log(`write                 : ${report.write}`);
    console.log('sampleMasters(2)      :');
    console.log(JSON.stringify(masters.slice(0, 2), null, 2));
    console.log('JSON_REPORT_BEGIN');
    console.log(JSON.stringify(report));
    console.log('JSON_REPORT_END');
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  console.error('[medical-device-gate-b-promotion] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
