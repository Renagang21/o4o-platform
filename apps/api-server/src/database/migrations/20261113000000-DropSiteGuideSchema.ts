import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SITEGUIDE-LEGACY-CODE-REMOVAL-V1
 *
 * SiteGuide 는 O4O 에서 완전히 제거되었으며, 향후 별도 저장소에서
 * 신규 서비스로 다시 개발한다. 라이브 DB 에 남아 있던 siteguide 스키마와
 * 관련 테이블/ENUM 을 전부 제거한다.
 *
 * 제거 대상 (CreateSiteGuideTables1737330000000 가 생성):
 * - siteguide.siteguide_execution_logs
 * - siteguide.siteguide_usage_summaries
 * - siteguide.siteguide_api_keys
 * - siteguide.siteguide_businesses
 * - ENUM 4종 + siteguide 스키마
 */
export class DropSiteGuideSchema20261113000000 implements MigrationInterface {
  name = 'DropSiteGuideSchema20261113000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop tables (CASCADE 로 FK/인덱스 동시 제거)
    await queryRunner.query(`DROP TABLE IF EXISTS siteguide.siteguide_execution_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS siteguide.siteguide_usage_summaries CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS siteguide.siteguide_api_keys CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS siteguide.siteguide_businesses CASCADE`);

    // 2. Drop ENUM types
    await queryRunner.query(`DROP TYPE IF EXISTS siteguide.siteguide_execution_result`);
    await queryRunner.query(`DROP TYPE IF EXISTS siteguide.siteguide_execution_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS siteguide.siteguide_api_key_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS siteguide.siteguide_business_status`);

    // 3. Drop the schema itself (이제 다른 객체가 없으므로 안전)
    await queryRunner.query(`DROP SCHEMA IF EXISTS siteguide CASCADE`);
  }

  public async down(): Promise<void> {
    // Forward-only: SiteGuide 는 O4O 에서 영구 제거되었으므로 복원하지 않는다.
    // 재개 시 별도 저장소에서 신규 스키마로 생성한다.
  }
}
