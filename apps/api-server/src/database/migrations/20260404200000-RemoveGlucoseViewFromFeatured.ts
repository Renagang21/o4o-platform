/**
 * RemoveGlucoseViewFromFeatured
 *
 * WO-KPA-SOCIETY-HUB-RECOMMENDED-SERVICE-GLYCOPHARM-SWAP-V1
 *
 * 약국 HUB 추천 서비스에서 GlucoseView를 제거한다.
 * GlycoPharm(약국 운영 서비스)은 이미 featured 상태이므로 유지.
 *
 * 변경 후 추천 서비스:
 * - GlycoPharm ✅ (featured_order=1)
 * - K-Cosmetics ✅ (featured_order=4)
 * - GlucoseView ❌ (제거)
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveGlucoseViewFromFeatured20260404200000 implements MigrationInterface {
  name = 'RemoveGlucoseViewFromFeatured20260404200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "platform_services"
      SET "is_featured" = false
      WHERE "code" = 'glucoseview'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "platform_services"
      SET "is_featured" = true
      WHERE "code" = 'glucoseview'
    `);
  }
}
