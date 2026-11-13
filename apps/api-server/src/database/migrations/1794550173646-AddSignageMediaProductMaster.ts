import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1 T4 — 사이니지 영상에 「이 영상의 제품」 한 칸(D6 · 2026-11-13 통합 담당 승인).
 *
 * 표준 제품 마스터를 가리킨다. 비워 두면 제품과 무관한 영상이다. 기존 행은 바꾸지 않는다.
 * 외래 키는 두지 않는다 — 쓰는 쪽(매장 · 운영자 · 공급자 API)이 제품 존재 · 범위를 확인하고,
 * 읽는 쪽은 product_masters 와 JOIN 해 없는 제품을 무시한다. 영상 삭제 · 제품 정리에 서로 묶이지 않는다.
 */
export class AddSignageMediaProductMaster1794550173646 implements MigrationInterface {
  name = 'AddSignageMediaProductMaster1794550173646';

  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE signage_media ADD COLUMN IF NOT EXISTS "productMasterId" uuid NULL');
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_signage_media_productMasterId" ON signage_media ("productMasterId")
      WHERE "productMasterId" IS NOT NULL AND "deletedAt" IS NULL`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP INDEX IF EXISTS "IDX_signage_media_productMasterId"');
    await q.query('ALTER TABLE signage_media DROP COLUMN IF EXISTS "productMasterId"');
  }
}
