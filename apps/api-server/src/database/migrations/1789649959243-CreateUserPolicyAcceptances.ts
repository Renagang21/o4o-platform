import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §2 · §3 · §4 · §24
 * 근거 IR: IR-O4O-INTEGRATED-TERMS-RUNTIME-CONTRACT-CENSUS-V1 §4 (동의 기록 TIMESTAMP_ONLY · 버전 추적 0)
 *
 * user_policy_acceptances — 이용약관 **acceptance(계약상 승낙) 이력**. 약관 동의의 SSOT.
 *   user_id            — 승낙한 사용자 (users.id)
 *   service_key        — 승낙이 이루어진 서비스 (neture / kpa-society / k-cosmetics / pharmacy-hub)
 *   policy_document_id — 실제 승낙한 service_policy_documents.id (버전별 row)
 *   document_type      — 'terms' (이번 WO 의 필수 대상)
 *   version            — 승낙 당시 문서 version
 *   content_hash       — 승낙 당시 본문 sha256(hex) — 게시 후 본문 동일성 검증
 *   acceptance_kind    — 'agreement' (약관) · 향후 'acknowledgement' · 'consent' 확장 여지
 *   accepted_at        — 명시적 승낙 시각
 *
 * 이름이 consents 가 아닌 이유: 개인정보보호법상 개인정보 '동의(consent)' 와 약관의 계약상 '승낙(acceptance)'
 * 을 섞지 않는다 (WO §2). 개인정보 처리방침 확인 · 마케팅 선택동의는 이 테이블에 기록하지 않는다 (WO §14).
 *
 * FK delete policy: RESTRICT(기본). users 는 하드 삭제 시 FK 위반 → 기존 soft-delete 폴백(AdminUserController)
 * 과 동일 거동. service_policy_documents 는 물리 삭제 없음(archive 만). cascade 를 추측 적용하지 않는다 (WO §4).
 *
 * 금지(WO §24): users 기존 동의 컬럼 삭제 0 · 기존 tos_accepted_at 의 v1 backfill 0 · 기존 policy document 변경 0.
 * raw 마이그레이션 + raw SQL 서비스 접근(TypeORM entity 미등록) — work_run_coordination 과 동일 패턴.
 */
export class CreateUserPolicyAcceptances1789649959243 implements MigrationInterface {
  name = 'CreateUserPolicyAcceptances1789649959243';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_policy_acceptances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        service_key VARCHAR(50) NOT NULL,
        policy_document_id UUID NOT NULL,
        document_type VARCHAR(50) NOT NULL,
        version INTEGER NOT NULL,
        content_hash CHAR(64) NOT NULL,
        acceptance_kind VARCHAR(20) NOT NULL DEFAULT 'agreement',
        accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "CHK_user_policy_acceptances_kind"
          CHECK (acceptance_kind IN ('agreement','acknowledgement','consent')),
        CONSTRAINT "UQ_user_policy_acceptances_user_service_document"
          UNIQUE (user_id, service_key, policy_document_id),
        CONSTRAINT "FK_user_policy_acceptances_user"
          FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT "FK_user_policy_acceptances_policy_document"
          FOREIGN KEY (policy_document_id) REFERENCES service_policy_documents(id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_policy_acceptances_user" ON user_policy_acceptances (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_policy_acceptances_policy_document" ON user_policy_acceptances (policy_document_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_policy_acceptances`);
  }
}
