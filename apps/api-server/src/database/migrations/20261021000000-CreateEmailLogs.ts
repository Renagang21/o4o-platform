import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-EMAIL-LOG-TABLE-CREATE-V1
 *
 * email_logs 테이블 생성 — packages/mail-core 의 EmailLog entity 대응.
 *
 * 배경: EmailLog entity 는 존재하지만 production 에 CREATE TABLE migration 이 없어
 *   회원 승인/이메일 발송 후 INSERT INTO "email_logs" ... 가 `relation does not exist`
 *   (42P01/42703) 로 실패. 회원 승인 이메일 발송 자체는 성공하지만 로그 INSERT 만 실패.
 *
 * 컬럼/네이밍: TypeORM 의 SnakeNamingStrategy 비활성 상태(connection.ts:570) 이므로
 *   property 명 그대로 camelCase 컬럼 (quoted) 사용. enum 타입명은 TypeORM 의 기본 명명
 *   규칙 (`{table}_{column}_enum`) 을 따라 `email_logs_status_enum`.
 *
 * Idempotent: IF NOT EXISTS / DO $$ ... EXCEPTION WHEN duplicate_object ... END $$ 패턴.
 */
export class CreateEmailLogs20261021000000 implements MigrationInterface {
  name = 'CreateEmailLogs20261021000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] CreateEmailLogs - Starting...');

    // Step 1: Create enum (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE email_logs_status_enum AS ENUM ('pending', 'sent', 'failed', 'bounced', 'complained');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Step 2: Create table (idempotent)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        recipient VARCHAR NOT NULL,
        sender VARCHAR,
        subject VARCHAR NOT NULL,
        body TEXT,
        "htmlBody" TEXT,
        status email_logs_status_enum NOT NULL DEFAULT 'pending',
        "messageId" VARCHAR,
        provider VARCHAR,
        response JSON,
        error TEXT,
        "retryCount" INTEGER NOT NULL DEFAULT 0,
        "sentAt" TIMESTAMP,
        "openedAt" TIMESTAMP,
        "clickedAt" TIMESTAMP,
        attachments JSON,
        "emailType" VARCHAR,
        "userId" INTEGER,
        "orderId" VARCHAR,
        metadata JSON,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Step 3: Indexes (idempotent) — entity 의 @Index(['status','createdAt']) / @Index(['recipient'])
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_email_logs_status_createdAt" ON email_logs(status, "createdAt");`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_email_logs_recipient" ON email_logs(recipient);`
    );

    console.log('[MIGRATION] email_logs table ready');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_logs_recipient";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_logs_status_createdAt";`);
    await queryRunner.query(`DROP TABLE IF EXISTS email_logs;`);
    await queryRunner.query(`DROP TYPE IF EXISTS email_logs_status_enum;`);
    console.log('[MIGRATION] email_logs table dropped');
  }
}
