/**
 * AddContactPrivacyConsentNetureKpa
 *
 * WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1
 *
 * 개인정보 동의 + Neture IP hash 전환을 위한 additive 컬럼 추가.
 * - neture_contact_messages."ipHash" VARCHAR(64) NULL — 신규 저장은 IP 원문 대신 hash (camelCase 컨벤션)
 * - neture_contact_messages."privacyConsent" BOOLEAN DEFAULT false — 공개 submit 동의 (신규 true)
 * - contact_requests.privacy_consent BOOLEAN DEFAULT false — KPA 동의 (snake_case 컨벤션, 신규 true)
 *
 * 모두 additive. 기존 row 는 false/null. 기존 neture ipAddress(원문) 컬럼은 drop 하지 않는다
 * (legacy 보존 — 후속 cleanup WO 대상). rollback 시 추가 컬럼만 제거.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactPrivacyConsentNetureKpa20261109000000 implements MigrationInterface {
  name = 'AddContactPrivacyConsentNetureKpa20261109000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('neture_contact_messages')) {
      if (!(await queryRunner.hasColumn('neture_contact_messages', 'ipHash'))) {
        await queryRunner.query(`ALTER TABLE neture_contact_messages ADD COLUMN "ipHash" VARCHAR(64) NULL`);
      }
      if (!(await queryRunner.hasColumn('neture_contact_messages', 'privacyConsent'))) {
        await queryRunner.query(`ALTER TABLE neture_contact_messages ADD COLUMN "privacyConsent" BOOLEAN NOT NULL DEFAULT false`);
      }
    }

    if (await queryRunner.hasTable('contact_requests')) {
      if (!(await queryRunner.hasColumn('contact_requests', 'privacy_consent'))) {
        await queryRunner.query(`ALTER TABLE contact_requests ADD COLUMN privacy_consent BOOLEAN NOT NULL DEFAULT false`);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('neture_contact_messages')) {
      if (await queryRunner.hasColumn('neture_contact_messages', 'privacyConsent')) {
        await queryRunner.query(`ALTER TABLE neture_contact_messages DROP COLUMN "privacyConsent"`);
      }
      if (await queryRunner.hasColumn('neture_contact_messages', 'ipHash')) {
        await queryRunner.query(`ALTER TABLE neture_contact_messages DROP COLUMN "ipHash"`);
      }
    }
    if (await queryRunner.hasTable('contact_requests')) {
      if (await queryRunner.hasColumn('contact_requests', 'privacy_consent')) {
        await queryRunner.query(`ALTER TABLE contact_requests DROP COLUMN privacy_consent`);
      }
    }
  }
}
