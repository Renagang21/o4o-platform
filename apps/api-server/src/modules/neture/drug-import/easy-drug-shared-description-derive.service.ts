/**
 * Easy Drug → SharedProductDescription Derivation Service (raw batch, DataSource-backed)
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
 *   - 저장값 sanitize = sanitizeDescriptionHtml (sanitize-on-write 계약 유지). 대량 write 는 청크 INSERT.
 *   - raw ds.query 만 사용(엔티티 메타 불필요) — drug promotion 배치와 동일 패턴.
 */

import type { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { sanitizeDescriptionHtml } from '../utils/sanitize-description-html.util.js';

export const EASY_DRUG_SPD_SOURCE_TYPE = 'mfds_easy_drug';
export const EASY_DRUG_SPD_STATUS = 'needs_review';
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
 * 원문 텍스트를 HTML 에 넣기 전 escape (기존 유효 엔티티는 보존).
 *
 * WO-O4O-OTC-COMPOSER-ESCAPE-BEFORE-SANITIZE-V1.
 *
 * 허가 원문(사용상주의사항 등)은 **plain text** 이지만 `AST<3배`, `혈소판<10만` 처럼
 * `<` 가 문자·숫자에 바로 붙는 표기를 포함한다. escape 없이 `<p>` 에 넣으면
 * 뒤이은 sanitize(DOMPurify)가 `<B 이고 C>` 를 `<b>` 태그로 파싱해 **문장을 삼킨다**
 * (실증: `A<B 이고 C>D` → `A<b>D</b>` 로 "B 이고 C" 유실). 그래서 write-path 진입 전에
 * bare `< > &` 를 엔티티로 치환한다.
 *
 * 단 재수집 원문은 `크레아티닌 청소율 &lt; 10mL/min` 처럼 이미 엔티티로 인코딩된
 * 구간을 담을 수 있다. `&` 를 무조건 escape 하면 `&lt;` → `&amp;lt;` 이중 escape 가 되어
 * 화면에 `&lt;` 가 그대로 보인다. 따라서 `&` 는 **유효 엔티티의 시작이 아닐 때만** escape 한다.
 * 결과적으로 bare `< 10mL/min` 과 `&lt; 10mL/min` 모두 화면에 `< 10mL/min` 로 표시된다.
 */
export function escapeHtmlPreservingEntities(text: string): string {
  return String(text)
    // 유효 엔티티(`&name;` · `&#123;` · `&#x1F;`)의 시작이 아닌 `&` 만 escape → 이중 escape 방지
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{0,31}|#\d{1,7}|#x[0-9a-fA-F]{1,6});)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * officialConsumerText → HTML 조합 (PURE). seedFromDrugExtension 과 동일한 섹션 스타일.
 * 값 없는 섹션은 제외. 전 섹션 결측이면 빈 문자열(→ 후보 미생성).
 *
 * 원문 값은 plain text 이므로 삽입 전 escape-before-sanitize 로 특수문자 유실을 막는다
 * (label 은 이 파일의 고정 상수라 escape 대상 아님).
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
    .map(
      ([label, v]) =>
        `<p><strong>${label}</strong><br/>${escapeHtmlPreservingEntities(String(v).trim())}</p>`,
    )
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
  matchedCandidates: number;
  unmatchedCandidates: number;
  emptyContentCandidates: number;
  masterLinksConsidered: number;
  created: number;
  skippedDuplicate: number;
  skippedEmpty: number;
  errored: number;
  errors: Array<{ candidateId: string; masterId: string | null; reason: string }>;
}

interface EasyCandRow {
  id: string;
  item_seq: string | null;
  oct: OfficialConsumerText | null;
}

interface BufferedSpd {
  id: string;
  masterId: string;
  content: string;
  sourceRefId: string;
}

export class EasyDrugSharedDescriptionDeriveService {
  constructor(private readonly dataSource: DataSource) {}

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

  /** 기존 mfds_easy_drug 파생 (master_id, source_ref_id) 선적재 → dedup Set */
  private async preloadExisting(): Promise<Set<string>> {
    const rows: Array<{ master_id: string; source_ref_id: string | null }> =
      await this.dataSource.query(
        `SELECT master_id, source_ref_id FROM shared_product_descriptions
          WHERE source_type=$1 AND deleted_at IS NULL`,
        [EASY_DRUG_SPD_SOURCE_TYPE],
      );
    const set = new Set<string>();
    for (const r of rows) if (r.source_ref_id) set.add(`${r.master_id}::${r.source_ref_id}`);
    return set;
  }

  /** 청크 multi-row INSERT (10 param/row, chunk 500) */
  private async flush(buf: BufferedSpd[]): Promise<void> {
    const size = 500;
    for (let i = 0; i < buf.length; i += size) {
      const chunk = buf.slice(i, i + size);
      if (chunk.length === 0) continue;
      const vals: string[] = [];
      const params: unknown[] = [];
      let p = 1;
      for (const b of chunk) {
        // id, master_id, content, summary(null), source_type, source_ref_id, status, language, created_at, updated_at
        vals.push(
          `($${p++}, $${p++}, $${p++}, NULL, $${p++}, $${p++}, $${p++}, 'ko', NOW(), NOW())`,
        );
        params.push(b.id, b.masterId, b.content, EASY_DRUG_SPD_SOURCE_TYPE, b.sourceRefId, EASY_DRUG_SPD_STATUS);
      }
      await this.dataSource.query(
        `INSERT INTO shared_product_descriptions
           (id, master_id, content, summary, source_type, source_ref_id, status, language, created_at, updated_at)
         VALUES ${vals.join(', ')}`,
        params,
      );
    }
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

    const existing = await this.preloadExisting();
    const buf: BufferedSpd[] = [];

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

        const composed = composeEasyDrugContent(cand.oct);
        const content = sanitizeDescriptionHtml(composed);
        const itemSeq = cand.item_seq != null ? String(cand.item_seq).trim() : '';
        const masterIds = itemSeq ? await this.findMasterIds(itemSeq) : [];

        if (masterIds.length === 0) {
          report.unmatchedCandidates += 1;
          continue;
        }
        report.matchedCandidates += 1;

        if (!content.trim()) {
          report.emptyContentCandidates += 1;
          report.masterLinksConsidered += masterIds.length;
          report.skippedEmpty += masterIds.length;
          continue;
        }

        for (const masterId of masterIds) {
          report.masterLinksConsidered += 1;
          const key = `${masterId}::${cand.id}`;
          if (existing.has(key)) {
            report.skippedDuplicate += 1;
            continue;
          }
          existing.add(key); // in-run dedup 방어
          report.created += 1;
          if (opts.apply) {
            buf.push({ id: randomUUID(), masterId, content, sourceRefId: cand.id });
            if (buf.length >= 2000) {
              await this.flush(buf);
              buf.length = 0;
            }
          }
        }
      }

      if (rows.length < take) break;
    }

    if (opts.apply && buf.length > 0) {
      await this.flush(buf);
      buf.length = 0;
    }

    return report;
  }
}
