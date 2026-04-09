/**
 * UnifyCareMessagesSenderTypePharmacy
 *
 * WO-O4O-GLYCOPHARM-PHARMACY-ONLY-ROLE-CLEANUP-V1 — Phase 2c
 *
 * care_messages.sender_type 값 통일:
 *   'pharmacist' → 'pharmacy'
 *
 * + CHECK 제약조건 추가: sender_type IN ('patient', 'pharmacy')
 *
 * 배경:
 *   GlycoPharm은 'pharmacy' (unprefixed) 롤만 사용하도록 정리됨
 *   (WO-O4O-GLYCOPHARM-PHARMACY-ONLY-ROLE-CLEANUP-V1).
 *   CareMessage의 sender_type 도 'pharmacist' 하드코딩에서
 *   'pharmacy'로 계약 통일. 백엔드 엔티티/서비스/컨트롤러 +
 *   프론트 DTO + 본 migration을 한 배포 사이클로 처리.
 *
 * 주의:
 *   부분 배포 금지 — 코드만 배포되고 기존 row는 'pharmacist'인 상태로
 *   방치되면 약사측 말풍선이 환자측으로 표시됨.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifyCareMessagesSenderTypePharmacy20260409500000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0) 테이블 존재 확인 — 없으면 skip (safety net)
    const exists = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'care_messages'
       LIMIT 1`,
    );
    if (!exists || exists.length === 0) {
      return;
    }

    // 1) 기존 'pharmacist' row → 'pharmacy'
    await queryRunner.query(
      `UPDATE care_messages
       SET sender_type = 'pharmacy'
       WHERE sender_type = 'pharmacist'`,
    );

    // 2) 기존 CHECK 제약조건 있으면 제거 후 재생성
    await queryRunner.query(
      `ALTER TABLE care_messages
       DROP CONSTRAINT IF EXISTS chk_care_messages_sender_type`,
    );

    // 3) CHECK 제약조건 추가
    await queryRunner.query(
      `ALTER TABLE care_messages
       ADD CONSTRAINT chk_care_messages_sender_type
       CHECK (sender_type IN ('patient', 'pharmacy'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'care_messages'
       LIMIT 1`,
    );
    if (!exists || exists.length === 0) {
      return;
    }

    // CHECK 제약조건 제거
    await queryRunner.query(
      `ALTER TABLE care_messages
       DROP CONSTRAINT IF EXISTS chk_care_messages_sender_type`,
    );

    // 데이터 역-보정 (롤백용)
    await queryRunner.query(
      `UPDATE care_messages
       SET sender_type = 'pharmacist'
       WHERE sender_type = 'pharmacy'`,
    );
  }
}
