import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KYC-DOCUMENTS-TABLE-CREATE-V1 (hotfix)
 *
 * kyc_documents 테이블 생성 — apps/api-server/src/entities/KycDocument.ts entity 대응.
 *
 * 배경: KycDocument entity 는 존재하지만 production 에 CREATE TABLE migration 이 없어
 *   `kyc_documents` 가 존재한 적이 없다(초기 synchronize 로만 생성되던 baseline 테이블).
 *   이후 supplier onboarding migration (20260615130000 / 140000 / 150000) 들이
 *   `REFERENCES kyc_documents(id)` FK 를 추가하면서 `relation "kyc_documents" does not exist`
 *   (42P01) 로 마이그레이션 체인 전체가 중단됨.
 *
 *   본 migration 은 그 FK 참조 대상 테이블을 먼저 생성한다. timestamp 를 20260615130000
 *   직전(20260615120000)으로 두어 FK migration 보다 먼저 실행되도록 한다.
 *   (선례: 20261021000000-CreateEmailLogs — entity 는 있으나 CREATE TABLE 누락 동일 케이스.)
 *
 * 컬럼/네이밍: SnakeNamingStrategy 비활성 상태(connection.ts) 이므로 entity property 명을
 *   그대로 사용한다. 명시적 @JoinColumn name 인 user_id / verified_by 만 snake_case,
 *   나머지(documentType/fileUrl/fileName/fileSize/mimeType/verificationStatus/verifiedAt/
 *   verificationNote/createdAt/updatedAt)는 camelCase(quoted).
 *
 * Idempotent: CREATE TABLE IF NOT EXISTS / FK·INDEX 는 존재 검사 후 추가.
 */
export class CreateKycDocuments20260615120000 implements MigrationInterface {
  name = 'CreateKycDocuments20260615120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] CreateKycDocuments - Starting...');

    // Step 1: Create table (idempotent) — KycDocument entity 대응
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kyc_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        "documentType" VARCHAR(50) NOT NULL,
        "fileUrl" VARCHAR(500) NOT NULL,
        "fileName" VARCHAR(255) NOT NULL,
        "fileSize" INTEGER,
        "mimeType" VARCHAR(100),
        "verificationStatus" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        "verifiedAt" TIMESTAMP,
        verified_by UUID,
        "verificationNote" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Step 2: FK user_id → users(id) ON DELETE CASCADE (entity: @ManyToOne onDelete CASCADE)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_kyc_documents_user'
        ) THEN
          ALTER TABLE kyc_documents
            ADD CONSTRAINT "FK_kyc_documents_user"
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Step 3: FK verified_by → users(id) ON DELETE SET NULL (nullable verifier ref)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_kyc_documents_verified_by'
        ) THEN
          ALTER TABLE kyc_documents
            ADD CONSTRAINT "FK_kyc_documents_verified_by"
            FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Step 4: Indexes — entity @Index(['userId']) / @Index(['verificationStatus']) / @Index(['documentType'])
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_kyc_documents_user_id" ON kyc_documents(user_id);`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_kyc_documents_verificationStatus" ON kyc_documents("verificationStatus");`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_kyc_documents_documentType" ON kyc_documents("documentType");`
    );

    console.log('[MIGRATION] kyc_documents table ready');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kyc_documents_documentType";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kyc_documents_verificationStatus";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kyc_documents_user_id";`);
    await queryRunner.query(`
      ALTER TABLE kyc_documents
        DROP CONSTRAINT IF EXISTS "FK_kyc_documents_verified_by",
        DROP CONSTRAINT IF EXISTS "FK_kyc_documents_user";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS kyc_documents;`);
    console.log('[MIGRATION] kyc_documents table dropped');
  }
}
