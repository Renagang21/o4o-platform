/**
 * ProductMasterNoteService — ProductMaster 내부 운영 메모 (append + soft delete)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-MASTER-NOTE-V1
 *
 * ProductMaster 본문/식별자/설명/이미지/후보는 **절대 수정하지 않는다**. 메모는 product_master_notes
 * 전용 테이블에만 기록한다. raw parameterized SQL. hard delete 금지(soft delete만).
 */

import type { DataSource } from 'typeorm';

export interface ProductMasterNoteRow {
  id: string;
  productMasterId: string;
  note: string;
  visibility: string;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
}

export class ProductMasterNoteService {
  constructor(private dataSource: DataSource) {}

  /** 활성 메모 목록(최신순). */
  async list(masterId: string): Promise<ProductMasterNoteRow[]> {
    const rows: Array<{
      id: string; product_master_id: string; note: string; visibility: string;
      created_by: string; created_by_name: string | null; created_at: string;
    }> = await this.dataSource.query(
      `SELECT n.id, n.product_master_id, n.note, n.visibility, n.created_by,
              COALESCE(u.name, u.email) AS created_by_name, n.created_at
         FROM product_master_notes n
         LEFT JOIN users u ON u.id = n.created_by
        WHERE n.product_master_id = $1 AND n.deleted_at IS NULL
        ORDER BY n.created_at DESC`,
      [masterId],
    );
    return rows.map((r) => ({
      id: r.id,
      productMasterId: r.product_master_id,
      note: r.note,
      visibility: r.visibility,
      createdBy: r.created_by,
      createdByName: r.created_by_name,
      createdAt: r.created_at,
    }));
  }

  /** master 실재 확인(FK 위반 대신 명확한 404). */
  async masterExists(masterId: string): Promise<boolean> {
    const r: { exists: boolean }[] = await this.dataSource.query(
      `SELECT EXISTS(SELECT 1 FROM product_masters WHERE id = $1) AS exists`,
      [masterId],
    );
    return !!r[0]?.exists;
  }

  /** 메모 추가(append). product_masters 무변경. */
  async add(masterId: string, note: string, createdBy: string): Promise<ProductMasterNoteRow | null> {
    const rows: { id: string; created_at: string }[] = await this.dataSource.query(
      `INSERT INTO product_master_notes (product_master_id, note, visibility, created_by)
       VALUES ($1, $2, 'internal', $3)
       RETURNING id, created_at`,
      [masterId, note, createdBy],
    );
    const inserted = rows[0];
    if (!inserted) return null;
    const list = await this.dataSource.query(
      `SELECT n.id, n.note, n.visibility, n.created_by, COALESCE(u.name, u.email) AS created_by_name, n.created_at
         FROM product_master_notes n LEFT JOIN users u ON u.id = n.created_by
        WHERE n.id = $1`,
      [inserted.id],
    );
    const r = list[0];
    return {
      id: r.id,
      productMasterId: masterId,
      note: r.note,
      visibility: r.visibility,
      createdBy: r.created_by,
      createdByName: r.created_by_name,
      createdAt: r.created_at,
    };
  }

  /** soft delete (hard delete 금지). 이미 삭제/타 master/미존재면 false(→404). RETURNING 으로 정확 판정. */
  async softDelete(masterId: string, noteId: string, deletedBy: string): Promise<boolean> {
    const rows: { id: string }[] = await this.dataSource.query(
      `UPDATE product_master_notes
          SET deleted_at = NOW(), deleted_by = $3
        WHERE id = $1 AND product_master_id = $2 AND deleted_at IS NULL
        RETURNING id`,
      [noteId, masterId, deletedBy],
    );
    return rows.length > 0;
  }
}
