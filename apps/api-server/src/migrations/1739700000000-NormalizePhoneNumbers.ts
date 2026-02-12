import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-PLATFORM-PHONE-NORMALIZATION-PHASE7-V1
 * Core(User) + KPA 전화번호 정규화: 숫자만 저장
 * 기존 데이터에서 하이픈, 공백, 괄호 등 비숫자 문자 제거
 */
export class NormalizePhoneNumbers1739700000000 implements MigrationInterface {
  name = 'NormalizePhoneNumbers1739700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Core: users.phone
    await queryRunner.query(`
      UPDATE "users"
      SET phone = regexp_replace(phone, '\\D', '', 'g')
      WHERE phone IS NOT NULL AND phone ~ '\\D'
    `);

    // KPA: kpa_organizations.phone
    await queryRunner.query(`
      UPDATE "kpa_organizations"
      SET phone = regexp_replace(phone, '\\D', '', 'g')
      WHERE phone IS NOT NULL AND phone ~ '\\D'
    `);

    // KPA: kpa_branch_officers.phone
    await queryRunner.query(`
      UPDATE "kpa_branch_officers"
      SET phone = regexp_replace(phone, '\\D', '', 'g')
      WHERE phone IS NOT NULL AND phone ~ '\\D'
    `);

    // KPA: kpa_branch_settings.phone + fax
    await queryRunner.query(`
      UPDATE "kpa_branch_settings"
      SET phone = regexp_replace(phone, '\\D', '', 'g')
      WHERE phone IS NOT NULL AND phone ~ '\\D'
    `);
    await queryRunner.query(`
      UPDATE "kpa_branch_settings"
      SET fax = regexp_replace(fax, '\\D', '', 'g')
      WHERE fax IS NOT NULL AND fax ~ '\\D'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 비가역 — 원본 포맷 복원 불가
    // 숫자만 남아있는 상태가 정상 기준이므로 down은 no-op
  }
}
