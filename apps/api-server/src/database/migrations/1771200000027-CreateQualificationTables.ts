import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-QUALIFICATION-SYSTEM-V1
 * Creates member_qualifications and qualification_requests tables
 */
export class CreateQualificationTables1771200000027 implements MigrationInterface {
  name = 'CreateQualificationTables1771200000027';

  async up(queryRunner: QueryRunner): Promise<void> {
    // member_qualifications: 사용자가 보유한 자격 상태
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS member_qualifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        qualification_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        requested_at TIMESTAMP,
        approved_at TIMESTAMP,
        rejected_at TIMESTAMP,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_member_qualification UNIQUE (user_id, qualification_type),
        CONSTRAINT fk_member_qual_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_member_qual_user
        ON member_qualifications (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_member_qual_type_status
        ON member_qualifications (qualification_type, status)
    `);

    // qualification_requests: 신청 이력 + 심사 기록
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qualification_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        qualification_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        request_data JSONB NOT NULL DEFAULT '{}',
        review_note TEXT,
        reviewed_by UUID,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_qual_req_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qual_req_user_type
        ON qualification_requests (user_id, qualification_type)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qual_req_status_type
        ON qualification_requests (status, qualification_type)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS qualification_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS member_qualifications`);
  }
}
