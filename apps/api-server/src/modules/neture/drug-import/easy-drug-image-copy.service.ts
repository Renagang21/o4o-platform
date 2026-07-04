/**
 * Easy Drug Image Copy Service — e약은요 외부 이미지 → GCS 사본 → ProductImage → 대표 썸네일 연결
 *
 * WO-O4O-EASY-DRUG-INFO-IMAGE-COPY-TO-PRODUCTIMAGE-V1 / Gate A·B
 * 설계: CHECK-O4O-EASY-DRUG-INFO-IMAGE-COPY-DRYRUN-V1
 *
 * 목적:
 *   e약은요 ProductCandidate.candidate_image_url(외부 nedrug.mfds.go.kr) 을 O4O GCS(o4o-media-library)로
 *   복사하고, ProductImage(type=thumbnail) 를 대표상품의 앵커 master 에 부착한 뒤,
 *   representative_products.thumbnail_image_id 로 연결한다. **대표당 1장**(SKU별 아님).
 *
 * 경계 (WO):
 *   - 생성/변경 = product_images(INSERT) + representative_products(thumbnail_image_id/metadata UPDATE) + GCS object.
 *   - ProductMaster/ProductIdentifier/SharedProductDescription/ProductCandidate/Offer/Listing/StoreLocalProduct 미생성·미변경.
 *
 * 정책 (확정 — CHECK §6, 사용자):
 *   - 앵커 master = 대표 멤버 중 min(master.id) 결정적.
 *   - ProductImage: type='thumbnail', is_primary=true, sort_order=0.
 *   - provenance = representative_products.metadata.thumbnailSource (product_images.metadata 컬럼 미추가).
 *   - 멱등: thumbnail_image_id 이미 있으면 skip.
 *   - 실패(404/timeout/비이미지): 1회 재시도 후 skip+errored, 배치 중단 없음.
 *   - dry-run 기본. apply 는 호출자(Job) 이중 가드.
 */

import type { DataSource } from 'typeorm';
import { ImageStorageService } from '../services/image-storage.service.js';

export const EASY_DRUG_SOURCE_KIND = 'easy_drug_info';
const FETCH_TIMEOUT_MS = 30000;

interface WorkItem {
  candidate_id: string;
  item_seq: string;
  url: string;
  rep_id: string;
  anchor_master_id: string | null;
}

export interface ImageCopyOptions {
  apply: boolean;
  limit?: number | null;
  concurrency?: number;
  nowIso: string; // 호출자(Job)가 주입 — 서비스는 시간 소스 없음
}

export interface ImageCopyReport {
  mode: 'dry-run' | 'apply';
  totalCandidatesWithImage: number;
  workItems: number; // 매칭 대표(썸네일 미보유) 대상
  wouldCopy: number;
  copied: number; // GCS upload + ProductImage + thumbnail 연결 성공
  skippedNoAnchor: number;
  skippedFetchFailed: number;
  skippedNotImage: number;
  errored: number;
  errors: Array<{ repId: string; itemSeq: string; reason: string }>;
}

export class EasyDrugImageCopyService {
  private readonly storage = new ImageStorageService();

  constructor(private readonly dataSource: DataSource) {}

  private async countCandidatesWithImage(): Promise<number> {
    const rows: Array<{ c: string }> = await this.dataSource.query(
      `SELECT count(*)::text AS c FROM product_candidates
        WHERE source_type='external_api' AND identifier_type='MFDS_CODE'
          AND raw_payload->>'sourceKind'=$1 AND deleted_at IS NULL
          AND coalesce(candidate_image_url,'')<>''`,
      [EASY_DRUG_SOURCE_KIND],
    );
    return parseInt(rows[0]?.c ?? '0', 10);
  }

  /** 작업 대상: 이미지 보유 candidate → 매칭 대표(썸네일 미보유) + 앵커 master(min id) */
  private async loadWorkItems(limit?: number | null): Promise<WorkItem[]> {
    const limitClause = limit != null ? `LIMIT ${limit}` : '';
    return this.dataSource.query(
      `WITH ci AS (
         SELECT id AS candidate_id, normalized_identifier_value AS item_seq, candidate_image_url AS url
           FROM product_candidates
          WHERE source_type='external_api' AND identifier_type='MFDS_CODE'
            AND raw_payload->>'sourceKind'=$1 AND deleted_at IS NULL
            AND coalesce(candidate_image_url,'')<>''
       )
       SELECT ci.candidate_id, ci.item_seq, ci.url, rp.id AS rep_id,
              (SELECT min(pm.id::text) FROM product_identifiers pi
                 JOIN product_masters pm ON pm.id = pi.product_master_id
                WHERE pi.identifier_type='MFDS_CODE' AND pi.normalized_value = ci.item_seq
                  AND pi.deleted_at IS NULL) AS anchor_master_id
         FROM ci
         JOIN representative_products rp ON rp.metadata->'sourceIdentifiers'->>'mfdsCode' = ci.item_seq
        WHERE rp.thumbnail_image_id IS NULL
        ORDER BY ci.item_seq
        ${limitClause}`,
      [EASY_DRUG_SOURCE_KIND],
    );
  }

  /** 외부 이미지 fetch (1회 재시도). 성공 시 {buffer, mime}. 실패/비이미지 → null + reason */
  private async fetchImage(url: string): Promise<{ buffer: Buffer; mime: string } | { error: string }> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
        } finally {
          clearTimeout(timer);
        }
        if (!res.ok) {
          if (attempt === 1) return { error: `HTTP_${res.status}` };
          continue;
        }
        const mime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (!mime.startsWith('image/')) {
          return { error: `NOT_IMAGE(${mime || 'unknown'})` };
        }
        const arr = await res.arrayBuffer();
        const buffer = Buffer.from(arr);
        if (buffer.length === 0) {
          if (attempt === 1) return { error: 'EMPTY_BODY' };
          continue;
        }
        return { buffer, mime };
      } catch (e) {
        if (attempt === 1) return { error: `FETCH_ERR:${(e as Error).message}` };
      }
    }
    return { error: 'FETCH_ERR:unreachable' };
  }

  /** 한 작업 항목 처리 (apply). 성공=true */
  private async processOne(item: WorkItem, report: ImageCopyReport, nowIso: string): Promise<void> {
    if (!item.anchor_master_id) {
      report.skippedNoAnchor += 1;
      return;
    }
    const fetched = await this.fetchImage(item.url);
    if ('error' in fetched) {
      if (fetched.error.startsWith('NOT_IMAGE')) report.skippedNotImage += 1;
      else report.skippedFetchFailed += 1;
      if (report.errors.length < 30) {
        report.errors.push({ repId: item.rep_id, itemSeq: item.item_seq, reason: fetched.error });
      }
      return;
    }

    try {
      const { url: gcsUrl, gcsPath } = await this.storage.uploadImage(
        item.anchor_master_id,
        fetched.buffer,
        fetched.mime,
        `${item.item_seq}`,
        'thumbnail',
      );

      // 트랜잭션: ProductImage INSERT → representative 연결 + provenance
      await this.dataSource.transaction(async (manager) => {
        const inserted: Array<{ id: string }> = await manager.query(
          `INSERT INTO product_images
             (id, master_id, image_url, gcs_path, sort_order, is_primary, type, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 0, true, 'thumbnail', NOW(), NOW())
           RETURNING id`,
          [item.anchor_master_id, gcsUrl, gcsPath],
        );
        const imageId = inserted[0].id;
        const thumbnailSource = {
          source: 'mfds_easy_drug',
          sourceItemSeq: item.item_seq,
          sourceCandidateId: item.candidate_id,
          anchorMasterId: item.anchor_master_id,
          productImageId: imageId,
          originalImageUrl: item.url,
          gcsPath,
          selectionPolicy: 'min_master_id',
          copiedAt: nowIso,
        };
        // 멱등 방어: thumbnail_image_id 아직 NULL 인 경우만 연결
        await manager.query(
          `UPDATE representative_products
              SET thumbnail_image_id = $1,
                  metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('thumbnailSource', $2::jsonb),
                  updated_at = NOW()
            WHERE id = $3 AND thumbnail_image_id IS NULL`,
          [imageId, JSON.stringify(thumbnailSource), item.rep_id],
        );
      });
      report.copied += 1;
    } catch (e) {
      report.errored += 1;
      if (report.errors.length < 30) {
        report.errors.push({ repId: item.rep_id, itemSeq: item.item_seq, reason: `WRITE:${(e as Error).message}` });
      }
    }
  }

  async run(opts: ImageCopyOptions): Promise<ImageCopyReport> {
    const report: ImageCopyReport = {
      mode: opts.apply ? 'apply' : 'dry-run',
      totalCandidatesWithImage: await this.countCandidatesWithImage(),
      workItems: 0,
      wouldCopy: 0,
      copied: 0,
      skippedNoAnchor: 0,
      skippedFetchFailed: 0,
      skippedNotImage: 0,
      errored: 0,
      errors: [],
    };

    const items = await this.loadWorkItems(opts.limit);
    report.workItems = items.length;
    report.wouldCopy = items.filter((i) => i.anchor_master_id).length;

    if (!opts.apply) {
      report.skippedNoAnchor = items.filter((i) => !i.anchor_master_id).length;
      return report;
    }

    // 동시성 제한 배치 처리 (I/O bound: fetch + GCS)
    const concurrency = Math.max(1, opts.concurrency ?? 16);
    for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency);
      await Promise.all(chunk.map((it) => this.processOne(it, report, opts.nowIso)));
    }
    return report;
  }
}
