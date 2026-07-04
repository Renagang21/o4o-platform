/**
 * Easy Drug → SharedProductDescription Derivation Service
 *
 * WO-O4O-EASY-DRUG-INFO-CANDIDATE-APPLY-AND-SHARED-DESCRIPTION-DERIVATION-V1 / Gate C
 * 설계: CHECK-O4O-EASY-DRUG-INFO-CANDIDATE-TO-MASTER-DRUGEXTENSION-DESIGN-V1 §10,
 *       CHECK-O4O-EASY-DRUG-INFO-SHARED-DESCRIPTION-DERIVATION-DRYRUN-V1
 *
 * 목적:
 *   이미 적재된 e약은요 ProductCandidate(external_api / MFDS_CODE=itemSeq / sourceKind=easy_drug_info)의
 *   공식 소비자 설명(raw_payload.officialConsumerText)을, **itemSeq=MFDS_CODE 로 매칭되는 각
 *   ProductMaster** 에 SharedProductDescription 후보로 파생한다. (설명 1벌 → N master, 1:N)
 *
 * 경계 (WO):
 *   - 생성 대상 = shared_product_descriptions 뿐.
 *   - ProductMaster / ProductIdentifier / RepresentativeProduct / ProductDrugExtension /
 *     ProductImage / SupplierProductOffer / OrganizationProductListing / StoreLocalProduct 미생성.
 *   - source_type = 'mfds_easy_drug' (신규 union), status = 'needs_review' (공식 설명 법적 검수 전제).
 *   - dedup = (master_id, source_type='mfds_easy_drug', source_ref_id=candidate.id) → 재실행 멱등.
 *   - dry-run 기본. apply 는 호출자(Job)가 이중 가드로 결정.
 *   - 저장값 sanitize 는 SharedProductDescriptionService.createCandidate 가 수행(sanitize-on-write).
 */

import type { DataSource } from 'typeorm';
import { SharedProductDescriptionService } from '../services/shared-product-description.service.js';

export const EASY_DRUG_SPD_SOURCE_TYPE = 'mfds_easy_drug' as const;
export const EASY_DRUG_SOURCE_KIND = 'easy_drug_info';

/** e약은요 공식 소비자 설명 원문 (candidate.raw_payload.officialConsumerText) */
export interface OfficialConsumerText {
  efficacy?: string | null;
  usage?: string | null;
  warning?: string | null;
  caution?: string | null;
  interaction?: string | null;
  sideEffect?: string | null;
  storage?: string | null;
}

/**
 * officialConsumerText → HTML 조합 (PURE). seedFromDrugExtension 과 동일한 섹션 스타일.
 * 값 없는 섹션은 제외. 전 섹션 결측이면 빈 문자열(→ 후보 미생성).
 */
export function composeEasyDrugContent(oct: OfficialConsumerText | null | undefined): string {
  if (!oct) return '';
  const sections: Array<[string, string | null | undefined]> = [
    ['효능·효과', oct.efficacy],
    ['용법·용량', oct.usage],
    ['경고', oct.warning],
    ['사용상 주의사항', oct.caution],
    ['상호작용', oct.interaction],
    ['이상반응', oct.sideEffect],
    ['저장방법', oct.storage],
  ];
  return sections
    .filter(([, v]) => v != null && String(v).trim().length > 0)
    .map(([label, v]) => `<p><strong>${label}</strong><br/>${String(v).trim()}</p>`)
    .join('\n');
}

export interface DeriveOptions {
  apply: boolean;
  /** 처리 candidate 제한 (샘플 실증용) */
  limit?: number | null;
  pageSize?: number;
  actorId?: string | null;
}

export interface DeriveReport {
  mode: 'dry-run' | 'apply';
  sourceType: string;
  totalEasyCandidates: number;
  scannedCandidates: number;
  /** 매칭 master 가 1개 이상인 candidate */
  matchedCandidates: number;
  /** 매칭 master 0개 candidate (active master 없음) */
  unmatchedCandidates: number;
  /** 조합 결과 빈 content candidate (officialConsumerText 전무) */
  emptyContentCandidates: number;
  /** candidate×master 로 고려된 파생 링크 총수 */
  masterLinksConsidered: number;
  /** 신규 생성(apply) 또는 생성 예정(dry-run) */
  created: number;
  /** dedup 으로 skip (기존 동일 source_ref) */
  skippedDuplicate: number;
  /** 빈 content 로 skip */
  skippedEmpty: number;
  errored: number;
  errors: Array<{ candidateId: string; masterId: string | null; reason: string }>;
}

interface EasyCandRow {
  id: string;
  item_seq: string | null;
  oct: OfficialConsumerText | null;
}

export class EasyDrugSharedDescriptionDeriveService {
  private readonly spdService: SharedProductDescriptionService;

  constructor(private readonly dataSource: DataSource) {
    this.spdService = new SharedProductDescriptionService(dataSource);
  }

  /** e약은요 candidate 총수 */
  private async countCandidates(): Promise<number> {
    const rows: Array<{ c: string }> = await this.dataSource.query(
      `SELECT count(*)::text AS c FROM product_candidates
        WHERE source_type='external_api' AND identifier_type='MFDS_CODE'
          AND raw_payload->>'sourceKind'=$1 AND deleted_at IS NULL`,
      [EASY_DRUG_SOURCE_KIND],
    );
    return parseInt(rows[0]?.c ?? '0', 10);
  }

  /** itemSeq(MFDS_CODE) 로 매칭되는 active master id 목록 */
  private async findMasterIds(itemSeq: string): Promise<string[]> {
    const rows: Array<{ product_master_id: string }> = await this.dataSource.query(
      `SELECT DISTINCT product_master_id FROM product_identifiers
        WHERE identifier_type='MFDS_CODE' AND normalized_value=$1 AND deleted_at IS NULL`,
      [itemSeq],
    );
    return rows.map((r) => r.product_master_id);
  }

  /** 기존 파생 존재 (master_id, source_type, source_ref_id) — dedup */
  private async existsDerived(masterId: string, candidateId: string): Promise<boolean> {
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `SELECT id FROM shared_product_descriptions
        WHERE master_id=$1 AND source_type=$2 AND source_ref_id=$3 AND deleted_at IS NULL
        LIMIT 1`,
      [masterId, EASY_DRUG_SPD_SOURCE_TYPE, candidateId],
    );
    return rows.length > 0;
  }

  async run(opts: DeriveOptions): Promise<DeriveReport> {
    const pageSize = opts.pageSize ?? 500;
    const report: DeriveReport = {
      mode: opts.apply ? 'apply' : 'dry-run',
      sourceType: EASY_DRUG_SPD_SOURCE_TYPE,
      totalEasyCandidates: await this.countCandidates(),
      scannedCandidates: 0,
      matchedCandidates: 0,
      unmatchedCandidates: 0,
      emptyContentCandidates: 0,
      masterLinksConsidered: 0,
      created: 0,
      skippedDuplicate: 0,
      skippedEmpty: 0,
      errored: 0,
      errors: [],
    };

    let lastId = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      if (opts.limit != null && report.scannedCandidates >= opts.limit) break;
      const take =
        opts.limit != null ? Math.min(pageSize, opts.limit - report.scannedCandidates) : pageSize;
      const rows: EasyCandRow[] = await this.dataSource.query(
        `SELECT id, normalized_identifier_value AS item_seq,
                raw_payload->'officialConsumerText' AS oct
           FROM product_candidates
          WHERE source_type='external_api' AND identifier_type='MFDS_CODE'
            AND raw_payload->>'sourceKind'=$2 AND deleted_at IS NULL
            AND id > $1
          ORDER BY id ASC
          LIMIT ${take}`,
        [lastId, EASY_DRUG_SOURCE_KIND],
      );
      if (rows.length === 0) break;

      for (const cand of rows) {
        lastId = cand.id;
        report.scannedCandidates += 1;

        const content = composeEasyDrugContent(cand.oct);
        const itemSeq = cand.item_seq != null ? String(cand.item_seq).trim() : '';
        const masterIds = itemSeq ? await this.findMasterIds(itemSeq) : [];

        if (masterIds.length === 0) {
          report.unmatchedCandidates += 1;
          continue;
        }
        report.matchedCandidates += 1;

        if (!content.trim()) {
          // 매칭은 됐으나 조합 content 가 비어 파생 불가
          report.emptyContentCandidates += 1;
          report.masterLinksConsidered += masterIds.length;
          report.skippedEmpty += masterIds.length;
          continue;
        }

        for (const masterId of masterIds) {
          report.masterLinksConsidered += 1;
          try {
            if (await this.existsDerived(masterId, cand.id)) {
              report.skippedDuplicate += 1;
              continue;
            }
            if (opts.apply) {
              await this.spdService.createCandidate({
                masterId,
                content,
                sourceType: EASY_DRUG_SPD_SOURCE_TYPE,
                sourceRefId: cand.id,
                status: 'needs_review',
                createdBy: opts.actorId ?? null,
              });
            }
            report.created += 1;
          } catch (e) {
            report.errored += 1;
            if (report.errors.length < 20) {
              report.errors.push({
                candidateId: cand.id,
                masterId,
                reason: (e as Error).message,
              });
            }
          }
        }
      }

      if (rows.length < take) break;
    }

    return report;
  }
}
