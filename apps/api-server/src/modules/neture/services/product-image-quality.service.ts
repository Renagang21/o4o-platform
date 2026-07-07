/**
 * ProductImageQualityService — ProductMaster 이미지 상태 조회 (read-only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-QUALITY-SHELL-V1
 *
 * master 1건의 이미지 보유/대표 여부/썸네일을 집계한다. 이미지 생성/업로드/교체 없음.
 * **read-only** — 전부 parameterized SELECT. 이미지 원본 대량 로딩 없음(썸네일 URL만).
 *
 * imageStatus (DB 만으로 판정 가능한 범위):
 *   - has_representative_image        : is_primary=true 이미지 존재
 *   - has_images_no_representative    : 이미지 있으나 대표(primary) 없음
 *   - missing_image                   : 이미지 0
 *   broken_or_unavailable/unknown 은 DB 만으로 확정 불가(HTTP 확인 필요) → 서버 자동판정 안 함,
 *   UI 썸네일 onError fallback 으로 처리.
 */

import type { DataSource } from 'typeorm';

export type ImageStatus = 'has_representative_image' | 'has_images_no_representative' | 'missing_image';

export interface ImageQualityParams {
  imageStatus?: ImageStatus;
  regulatoryType?: string;
  hasRepresentative?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ImageQualityRow {
  masterId: string;
  productName: string;
  manufacturerName: string | null;
  regulatoryType: string | null;
  barcode: string | null;
  imageCount: number;
  hasRepresentative: boolean;
  thumbnailUrl: string | null;
  thumbnailType: string | null;
  imageStatus: ImageStatus;
  imageUpdatedAt: string | null;
}

const BASE_CTE = `
  WITH img AS (
    SELECT master_id,
      count(*) AS img_count,
      bool_or(is_primary) AS has_primary,
      (array_agg(image_url ORDER BY is_primary DESC, sort_order ASC))[1] AS thumb_url,
      (array_agg(type ORDER BY is_primary DESC, sort_order ASC))[1] AS thumb_type,
      max(updated_at) AS img_updated_at
    FROM product_images GROUP BY master_id
  ),
  joined AS (
    SELECT m.id AS master_id, m.name, m.manufacturer_name, m.regulatory_type, m.barcode,
      COALESCE(i.img_count, 0) AS image_count,
      COALESCE(i.has_primary, false) AS has_primary,
      i.thumb_url, i.thumb_type, i.img_updated_at,
      CASE WHEN i.master_id IS NULL THEN 'missing_image'
           WHEN i.has_primary THEN 'has_representative_image'
           ELSE 'has_images_no_representative' END AS image_status
    FROM product_masters m
    LEFT JOIN img i ON i.master_id = m.id
  )`;

export class ProductImageQualityService {
  constructor(private dataSource: DataSource) {}

  private buildWhere(params: ImageQualityParams): { sql: string; args: unknown[] } {
    const where: string[] = [];
    const args: unknown[] = [];
    const add = (clause: (i: number) => string, value: unknown) => {
      args.push(value);
      where.push(clause(args.length));
    };
    if (params.imageStatus) add((i) => `image_status = $${i}`, params.imageStatus);
    if (params.regulatoryType) add((i) => `regulatory_type = $${i}`, params.regulatoryType);
    if (params.hasRepresentative !== undefined) where.push(`has_primary = ${params.hasRepresentative ? 'true' : 'false'}`);
    if (params.q?.trim()) {
      args.push(`%${params.q.trim()}%`);
      const i = args.length;
      where.push(`(name ILIKE $${i} OR manufacturer_name ILIKE $${i} OR barcode ILIKE $${i} OR master_id::text ILIKE $${i})`);
    }
    return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', args };
  }

  async list(params: ImageQualityParams): Promise<{ items: ImageQualityRow[]; total: number }> {
    const { sql: whereSql, args } = this.buildWhere(params);

    const [{ count }]: { count: string }[] = await this.dataSource.query(
      `${BASE_CTE} SELECT COUNT(*) AS count FROM joined ${whereSql}`,
      args,
    );
    const total = Number(count);

    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const offset = Math.max(((params.page ?? 1) - 1) * limit, 0);
    const rows: {
      master_id: string; name: string; manufacturer_name: string | null; regulatory_type: string | null;
      barcode: string | null; image_count: string; has_primary: boolean; thumb_url: string | null;
      thumb_type: string | null; img_updated_at: string | null; image_status: string;
    }[] = await this.dataSource.query(
      `${BASE_CTE}
       SELECT master_id, name, manufacturer_name, regulatory_type, barcode,
         image_count, has_primary, thumb_url, thumb_type, img_updated_at, image_status
       FROM joined ${whereSql}
       ORDER BY (image_status='missing_image') ASC, name ASC
       LIMIT ${limit} OFFSET ${offset}`,
      args,
    );

    return {
      items: rows.map((r) => ({
        masterId: r.master_id,
        productName: r.name,
        manufacturerName: r.manufacturer_name,
        regulatoryType: r.regulatory_type,
        barcode: r.barcode,
        imageCount: Number(r.image_count),
        hasRepresentative: r.has_primary,
        thumbnailUrl: r.thumb_url,
        thumbnailType: r.thumb_type,
        imageStatus: r.image_status as ImageStatus,
        imageUpdatedAt: r.img_updated_at,
      })),
      total,
    };
  }

  async summary(): Promise<Record<string, number>> {
    const rows: { image_status: string; masters: string }[] = await this.dataSource.query(
      `${BASE_CTE} SELECT image_status, COUNT(*) AS masters FROM joined GROUP BY image_status`,
    );
    return Object.fromEntries(rows.map((r) => [r.image_status, Number(r.masters)]));
  }
}
