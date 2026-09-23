/**
 * SupplierProductImageService — 공급자 제공 이미지 자산의 소유 경계
 * (WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §G)
 *
 * 공급자는 ProductMaster 의 기준정보를 수정하지 않는다. 다만 별도 Offer 자산 테이블이 없는
 * 현재 스키마를 유지하는 동안 **자기가 올린 이미지**만 `product_images` 에 연결·관리한다.
 *
 *   업로드      → source='supplier_upload' · created_by=업로더 user id
 *   수정·삭제   → 대상 이미지가 source='supplier_upload' 이고 created_by 가 나일 때만
 *   대표 지정   → 대상이 내 이미지이고, 현재 primary 가 없거나 현재 primary 도 내 이미지일 때만
 *
 * `is_primary` 는 master 당 1개인 canonical 축이고 per-source 대표가 스키마에 없다(§G-2).
 * 따라서 다른 출처(admin_upload · candidate_promotion · 다른 supplier_upload · source=NULL)의
 * primary 는 **해제하지 않는다** — 그 경우는 409 로 거부한다. 기존 source=NULL 행을
 * supplier_upload 로 backfill 하지 않는다(§G-1, 출처 불명 = 공급자 수정 불가).
 *
 * DDL 0 · migration 0 — 현존 컬럼(source · created_by · is_primary)만 사용한다.
 */
import type { DataSource } from 'typeorm';

export const SUPPLIER_IMAGE_SOURCE = 'supplier_upload';

export interface ProductImageRow {
  id: string;
  master_id: string;
  source: string | null;
  created_by: string | null;
  is_primary: boolean;
  gcs_path: string | null;
  type: string;
  sort_order: number;
}

/** 공급자(업로더 user id)가 관리할 수 있는 이미지인가 — 출처와 생성자 둘 다 일치해야 한다. */
export function isSupplierOwnedImage(row: Pick<ProductImageRow, 'source' | 'created_by'> | null | undefined, userId: string): boolean {
  if (!row) return false;
  return row.source === SUPPLIER_IMAGE_SOURCE && !!row.created_by && row.created_by === userId;
}

const IMAGE_COLUMNS = 'id, master_id, source, created_by, is_primary, gcs_path, type, sort_order';

export class SupplierProductImageService {
  constructor(private readonly dataSource: DataSource) {}

  async getImage(imageId: string): Promise<ProductImageRow | null> {
    const rows = await this.dataSource.query(
      `SELECT ${IMAGE_COLUMNS} FROM product_images WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [imageId],
    );
    return rows[0] ?? null;
  }

  async getCurrentPrimary(masterId: string): Promise<ProductImageRow | null> {
    const rows = await this.dataSource.query(
      `SELECT ${IMAGE_COLUMNS} FROM product_images
        WHERE master_id = $1 AND is_primary = true AND deleted_at IS NULL
        ORDER BY sort_order ASC, created_at ASC LIMIT 1`,
      [masterId],
    );
    return rows[0] ?? null;
  }

  async getThumbnail(masterId: string): Promise<ProductImageRow | null> {
    const rows = await this.dataSource.query(
      `SELECT ${IMAGE_COLUMNS} FROM product_images
        WHERE master_id = $1 AND type = 'thumbnail' AND deleted_at IS NULL
        ORDER BY created_at ASC LIMIT 1`,
      [masterId],
    );
    return rows[0] ?? null;
  }

  async countImages(masterId: string): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS c FROM product_images WHERE master_id = $1 AND deleted_at IS NULL`,
      [masterId],
    );
    return rows[0]?.c ?? 0;
  }

  /**
   * 공급자 이미지 삽입. 출처·생성자를 반드시 기록한다.
   * 대표 지정은 **현재 primary 가 없을 때만** true 로 넣는다 — 다른 출처 primary 를 해제하지 않는다.
   */
  async insertImage(params: {
    masterId: string;
    imageUrl: string;
    gcsPath: string;
    type: 'thumbnail' | 'detail' | 'content';
    userId: string;
  }): Promise<{ id: string; isPrimary: boolean }> {
    const { masterId, imageUrl, gcsPath, type, userId } = params;
    const currentPrimary = await this.getCurrentPrimary(masterId);
    const sortOrder = await this.countImages(masterId);
    const makePrimary = currentPrimary === null;

    const rows = await this.dataSource.query(
      `INSERT INTO product_images
         (master_id, image_url, gcs_path, type, sort_order, is_primary, source, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, is_primary`,
      [masterId, imageUrl, gcsPath, type, sortOrder, makePrimary, SUPPLIER_IMAGE_SOURCE, userId],
    );
    return { id: rows[0].id, isPrimary: rows[0].is_primary };
  }

  /**
   * 대표 지정 — 호출 전 권한 판정(자기 이미지 · 현재 primary 도 자기 것 또는 없음)을 마친 상태에서만 부른다.
   * 해제 대상은 **내 supplier_upload 이미지로 한정**한다(다른 출처 primary 는 SQL 수준에서도 건드리지 않는다).
   */
  async setPrimary(imageId: string, masterId: string, userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE product_images SET is_primary = false
        WHERE master_id = $1 AND is_primary = true AND source = $2 AND created_by = $3`,
      [masterId, SUPPLIER_IMAGE_SOURCE, userId],
    );
    await this.dataSource.query(
      `UPDATE product_images SET is_primary = true
        WHERE id = $1 AND master_id = $2 AND source = $3 AND created_by = $4`,
      [imageId, masterId, SUPPLIER_IMAGE_SOURCE, userId],
    );
  }

  /**
   * 삭제 — 호출 전 소유 판정을 마친 상태에서만 부른다.
   * 대표였으면 **내 다음 이미지**만 대표로 승격한다. 내 이미지가 없으면 primary 없음 상태로 둔다
   * (다른 출처를 임의로 canonical 대표로 만들지 않는다).
   */
  async deleteImage(imageId: string, masterId: string, userId: string): Promise<{ gcsPath: string | null }> {
    const image = await this.getImage(imageId);
    if (!image || image.master_id !== masterId) {
      throw new Error('IMAGE_NOT_FOUND');
    }
    await this.dataSource.query(
      `DELETE FROM product_images WHERE id = $1 AND master_id = $2 AND source = $3 AND created_by = $4`,
      [imageId, masterId, SUPPLIER_IMAGE_SOURCE, userId],
    );

    if (image.is_primary) {
      const next = await this.dataSource.query(
        `SELECT id FROM product_images
          WHERE master_id = $1 AND source = $2 AND created_by = $3 AND deleted_at IS NULL
          ORDER BY sort_order ASC, created_at ASC LIMIT 1`,
        [masterId, SUPPLIER_IMAGE_SOURCE, userId],
      );
      if (next[0]?.id) {
        await this.dataSource.query(`UPDATE product_images SET is_primary = true WHERE id = $1`, [next[0].id]);
      }
    }

    return { gcsPath: image.gcs_path ?? null };
  }
}
