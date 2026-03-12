import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create password_reset_tokens and email_verification_tokens tables.
 *
 * These tables back PasswordResetToken and EmailVerificationToken entities
 * used by PasswordResetService and email verification flows.
 *
 * Both tables share the same schema: token, userId (FK → users.id), email,
 * expiresAt, usedAt, createdAt, with unique index on token and composite
 * index on (userId, createdAt).
 */
export class CreateAuthTokenTables1771200000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: skip if tables already exist (e.g. created by synchronize)
    const prtExists = await queryRunner.query(
      `SELECT to_regclass('public.password_reset_tokens') IS NOT NULL AS exists`,
    );
    if (!prtExists[0]?.exists) {
      await queryRunner.query(`
        CREATE TABLE "password_reset_tokens" (
          "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
          "token"      varchar NOT NULL,
          "userId"     uuid NOT NULL,
          "expiresAt"  timestamp NOT NULL,
          "email"      varchar NOT NULL,
          "usedAt"     timestamp,
          "createdAt"  timestamp NOT NULL DEFAULT now(),
          CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_password_reset_tokens_token" UNIQUE ("token"),
          CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("userId")
            REFERENCES "users"("id") ON DELETE CASCADE
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_password_reset_tokens_userId_createdAt"
          ON "password_reset_tokens" ("userId", "createdAt")
      `);

    }

    const evtExists = await queryRunner.query(
      `SELECT to_regclass('public.email_verification_tokens') IS NOT NULL AS exists`,
    );
    if (!evtExists[0]?.exists) {
      await queryRunner.query(`
        CREATE TABLE "email_verification_tokens" (
          "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
          "token"      varchar NOT NULL,
          "userId"     uuid NOT NULL,
          "expiresAt"  timestamp NOT NULL,
          "email"      varchar NOT NULL,
          "usedAt"     timestamp,
          "createdAt"  timestamp NOT NULL DEFAULT now(),
          CONSTRAINT "PK_email_verification_tokens" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_email_verification_tokens_token" UNIQUE ("token"),
          CONSTRAINT "FK_email_verification_tokens_user" FOREIGN KEY ("userId")
            REFERENCES "users"("id") ON DELETE CASCADE
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_email_verification_tokens_userId_createdAt"
          ON "email_verification_tokens" ("userId", "createdAt")
      `);

    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "email_verification_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
  }
}
