/**
 * RemoveNetureFromFeatured
 *
 * WO-KPA-DEMO-RECOMMENDED-SERVICE-FILTER-V1
 *
 * Neture는 공급자/파트너 전용 서비스로, 약사회 데모의
 * "플랫폼이 권하는 서비스" 영역에 노출되면 안 됨.
 *
 * 대상 서비스:
 * - Neture: supplier/partner audience → featured 제외
 *
 * 유지 서비스 (약사 대상):
 * - GlycoPharm ✅
 * - GlucoseView ✅
 * - K-Cosmetics ✅ (약사 참여 가능)
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveNetureFromFeatured2026020800001 implements MigrationInterface {
  name = 'RemoveNetureFromFeatured2026020800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "platform_services"
      SET "is_featured" = false
      WHERE "code" = 'neture'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "platform_services"
      SET "is_featured" = true
      WHERE "code" = 'neture'
    `);
  }
}
