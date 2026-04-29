import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-CONTENT-RESOURCE-SUBTYPE-SEPARATION-V1
 *
 * kpa_contents의 sub_type을 content/resource 허브 구분 기준으로 정비.
 *
 * 배경:
 *   /content 허브와 /resources 자료실이 동일 kpa_contents 테이블 + 엔드포인트를 공유하면서
 *   sub_type 구분 없이 전체가 조회되는 문제 정비.
 *
 * 처리:
 *   1. usage_type이 있는 항목 → sub_type='resource' (자료실 등록 항목)
 *   2. 그 외 published 항목 → sub_type='content' (콘텐츠 허브 항목)
 *   3. sub_type이 이미 지정된 항목은 변경하지 않음
 */
export class BackfillKpaContentsSubType20260430100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // usage_type이 있으면 자료실 항목 (LINK/DOWNLOAD/COPY/READ)
    await queryRunner.query(`
      UPDATE kpa_contents
      SET sub_type = 'resource'
      WHERE sub_type IS NULL
        AND usage_type IS NOT NULL
        AND is_deleted = false
    `);

    // 나머지 sub_type 없는 항목은 콘텐츠 허브 항목으로 분류
    await queryRunner.query(`
      UPDATE kpa_contents
      SET sub_type = 'content'
      WHERE sub_type IS NULL
        AND is_deleted = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 역방향: 이 마이그레이션이 설정한 값만 null로 복원
    // (수동 지정값 보호 불가 — down은 개발 환경 전용)
    await queryRunner.query(`
      UPDATE kpa_contents
      SET sub_type = NULL
      WHERE sub_type IN ('content', 'resource')
        AND is_deleted = false
    `);
  }
}
